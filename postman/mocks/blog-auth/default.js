/* eslint-disable @typescript-eslint/no-require-imports */
/* global pm */
// Local model: Ana reproduces Heroku's observed user/active; Bruno keeps the original contract.
const http = require('node:http');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const users = {
  ana: { id: 42, firstName: 'Ana', lastName: 'Pruebas', email: 'ana@example.test', role: 'user', status: 'active', photoUrl: null },
  bob: { id: 43, firstName: 'Bruno', lastName: 'Pruebas', email: 'bob@example.test', role: 'administrator', status: 'active', photoUrl: null },
};
const password = 'SimulationPassword123!';
const passwordValid = value => typeof value === 'string' && value.length >= 8 && value.length <= 72 && Buffer.byteLength(value) <= 72 && /\p{Lu}/u.test(value) && /\d/.test(value) && /[^\p{L}\p{N}\s]/u.test(value);
const emailValid = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const profileOf = user => ({ major: null, university: null, bio: null, registeredAt: '2026-11-05T12:00:00.000Z',
  _count: { posts: 2, groups: 1 }, ...user, id: String(user.id), photoPublicId: 'internal-photo-fixture',
  suspendedUntil: null, suspensionReason: 'internal-reason-fixture', suspendedBy: null });
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  // pm.state survives request executions; only synthetic test data belongs here.
  const stored = await pm.state.get('accounts') || {};
  const accounts = { ...users, ...stored };
  const body = req.body;
  const token = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('jwt='))?.slice(4);
  const accountKey = /^mock\.([a-z0-9]+)\.session$/.exec(token || '')?.[1];
  const current = accountKey && Object.hasOwn(accounts, accountKey) ? accounts[accountKey] : null;
  const saveAccount = async (key, account) => { stored[key] = account; await pm.state.set('accounts', stored); };

  if (req.method === 'POST' && path === '/api/v1/auth/register') {
    if (!body || Object.keys(body).some(k => !['firstName', 'lastName', 'email', 'password'].includes(k)) ||
        !['firstName', 'lastName'].every(k => typeof body[k] === 'string' && body[k].trim().length >= 2 && body[k].trim().length <= 80) ||
        !emailValid(body.email) || !passwordValid(body.password)) return send(res, 400, { message: 'Invalid registration' });
    const email = body.email.toLowerCase();
    if (email === 'limited@example.test') return send(res, 429, { message: 'Too many requests' });
    if (email === 'unavailable@example.test') { res.writeHead(503, { 'Content-Type': 'text/html' }); return res.end('<h1>Private upstream detail</h1>'); }
    if (Object.values(accounts).some(u => u.email === email)) return send(res, 409, { message: 'Duplicate email' });
    const id = 100 + Object.keys(stored).length;
    const user = { id, firstName: body.firstName.trim(), lastName: body.lastName.trim(), email, role: 'user', status: 'active', photoUrl: null };
    await saveAccount(`user${id}`, user);
    await pm.state.set(`password-${id}`, hash(body.password));
    return send(res, 201, profileOf(user));
  }
  if (req.method === 'POST' && path === '/api/v1/auth/forgot-password') {
    if (!body || Object.keys(body).some(k => k !== 'email') || !emailValid(body.email)) return send(res, 400, { message: 'Invalid email' });
    if (body.email === 'limited@example.test') return send(res, 429, { message: 'Too many requests' });
    return send(res, 202, { message: 'Neutral response' });
  }
  if (req.method === 'POST' && path === '/api/v1/auth/reset-password') {
    if (!body || Object.keys(body).some(k => !['token', 'newPassword'].includes(k)) || !passwordValid(body.newPassword)) return send(res, 400, { message: 'Invalid password' });
    // Fixed, non-secret fixtures: a = Ana; r = reset@example.test; e = expired.
    const email = body.token === 'a'.repeat(43) ? users.ana.email : body.token === 'r'.repeat(43) ? 'reset@example.test' : null;
    const user = Object.values(accounts).find(u => u.email === email);
    if (!user || await pm.state.get(`used-${body.token}`)) return send(res, 410, { message: 'Invalid, expired or used' });
    await pm.state.set(`used-${body.token}`, true);
    await pm.state.set(`password-${user.id}`, hash(body.newPassword));
    return send(res, 204);
  }
  if (req.method === 'POST' && path === '/api/v1/auth/login') {
    const body = req.body;
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || Object.keys(body).some(k => !['email', 'password'].includes(k))) return send(res, 400, { message: ['Invalid login body'] });
    const found = Object.entries(accounts).find(([, user]) => user.email === body.email);
    const expectedHash = found ? await pm.state.get(`password-${found[1].id}`) : null;
    if (hash(body.password) !== (expectedHash || hash(password))) return send(res, 401, { message: 'Invalid credentials' });
    if (body.email === 'suspended@example.test') return send(res, 403, { error: 'AccountSuspended', message: 'The account is suspended' });
    if (body.email === 'unavailable@example.test') { res.writeHead(503, { 'Content-Type': 'text/html' }); return res.end('<h1>Service unavailable</h1>'); }
    if (body.email === 'slow@example.test') await new Promise(resolve => setTimeout(resolve, 16_000));
    if (body.email === 'invalid@example.test') return send(res, 200, { id: 'incorrect' });
    if (body.email === 'missing-cookie@example.test') return send(res, 200, users.ana);
    const key = found?.[0] || 'ana';
    if (!found && body.email !== 'slow@example.test') return send(res, 401, { message: 'Invalid credentials' });
    return send(res, 200, accounts[key], { 'Set-Cookie': `jwt=mock.${key}.session; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict; Secure` });
  }
  if (req.method === 'GET' && path === '/api/v1/auth/me') {
    const token = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('jwt='))?.slice(4);
    if (token === 'mock.suspended.session') return send(res, 403, { error: 'AccountSuspended', message: 'The account is suspended' });
    if (token === 'mock.unavailable.session') return send(res, 503, { message: 'Unavailable' });
    return current ? send(res, 200, current) : send(res, 401, { message: 'Invalid or expired session' });
  }
  if (req.method === 'POST' && path === '/api/v1/auth/logout') {
    if ((req.headers.cookie || '').includes('mock.unavailable.session')) return send(res, 503, { message: 'Unavailable' });
    // Like Nest, logout removes the cookie but does not revoke copied JWTs.
    return send(res, 204, undefined, { 'Set-Cookie': 'jwt=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure' });
  }
  if (path === '/api/v1/users/me' || path === '/api/v1/users/me/photo') {
    if (token === 'mock.suspended.session') return send(res, 403, { error: 'AccountSuspended', message: 'The account is suspended' });
    if (token === 'mock.unavailable.session') return send(res, 503, { message: 'Unavailable' });
    if (!current) return send(res, 401, { message: 'Invalid or expired session' });
    if (req.method === 'GET' && path === '/api/v1/users/me') return send(res, 200, profileOf(current));
    if (req.method === 'PATCH' && path === '/api/v1/users/me') {
      const limits = { firstName: 80, lastName: 80, major: 100, university: 120, bio: 500 };
      if (!body || !Object.keys(body).length || Object.keys(body).some(k => !Object.hasOwn(limits, k))) return send(res, 400, { message: 'Invalid fields' });
      const changes = {};
      for (const [key, value] of Object.entries(body)) {
        const required = key === 'firstName' || key === 'lastName';
        if (value === null && !required) { changes[key] = null; continue; }
        if (typeof value !== 'string') return send(res, 400, { message: 'Invalid value' });
        const clean = value.replace(/<[^>]*>/g, '').trim();
        if (clean.length > limits[key] || (required && clean.length < 2)) return send(res, 400, { message: 'Invalid length' });
        changes[key] = clean;
      }
      const updated = { ...current, ...changes };
      await saveAccount(accountKey, updated);
      return send(res, 200, profileOf(updated));
    }
    if (req.method === 'PUT' && path === '/api/v1/users/me/photo') {
      if (!/^multipart\/form-data;.*boundary=/i.test(req.headers['content-type'] || '')) return send(res, 400, { message: 'Missing multipart boundary' });
      // Cloudinary and binary decoding are outside this mock; BFF validates file fields, MIME and size.
      const updated = { ...current, photoUrl: `https://images.example.test/profile-${current.id}.png` };
      await saveAccount(accountKey, updated);
      return send(res, 200, profileOf(updated));
    }
  }
  if (req.method === 'GET' && /^\/api\/v1\/users\/\d+$/.test(path)) {
    const id = path.split('/').pop();
    const user = Object.values(accounts).find(u => String(u.id) === id);
    if (!user) return send(res, 404, { message: 'Not found' });
    const p = profileOf(user);
    return send(res, 200, { id: p.id, firstName: p.firstName, lastName: p.lastName, role: p.role, major: p.major,
      university: p.university, bio: p.bio, photoUrl: p.photoUrl, registeredAt: p.registeredAt, _count: p._count });
  }
  send(res, 501, { message: 'This simulation does not model this endpoint.' });
}).listen(process.env.PORT || 4500);
