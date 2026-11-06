/* eslint-disable @typescript-eslint/no-require-imports */
// Local model: Ana reproduces Heroku's observed user/active; Bruno keeps the original contract.
const http = require('node:http');
const users = {
  ana: { id: 42, firstName: 'Ana', lastName: 'Pruebas', email: 'ana@example.test', role: 'user', status: 'active', photoUrl: null },
  bob: { id: 43, firstName: 'Bruno', lastName: 'Pruebas', email: 'bob@example.test', role: 'administrador', status: 'activo', photoUrl: null },
};
const password = 'SimulationPassword123!';
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'POST' && path === '/api/v1/auth/login') {
    const body = req.body;
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || Object.keys(body).some(k => !['email', 'password'].includes(k))) return send(res, 400, { message: ['Invalid login body'] });
    if (body.password !== password) return send(res, 401, { message: 'Invalid credentials' });
    if (body.email === 'suspended@example.test') return send(res, 403, { message: 'Suspended account' });
    if (body.email === 'unavailable@example.test') { res.writeHead(503, { 'Content-Type': 'text/html' }); return res.end('<h1>Service unavailable</h1>'); }
    if (body.email === 'slow@example.test') await new Promise(resolve => setTimeout(resolve, 16_000));
    if (body.email === 'invalid@example.test') return send(res, 200, { id: 'incorrect' });
    if (body.email === 'missing-cookie@example.test') return send(res, 200, users.ana);
    const key = body.email === users.bob.email ? 'bob' : 'ana';
    if (![users.ana.email, users.bob.email, 'slow@example.test'].includes(body.email)) return send(res, 401, { message: 'Invalid credentials' });
    return send(res, 200, users[key], { 'Set-Cookie': `jwt=mock.${key}.session; Max-Age=3600; Path=/; HttpOnly; SameSite=Strict; Secure` });
  }
  if (req.method === 'GET' && path === '/api/v1/auth/me') {
    const token = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('jwt='))?.slice(4);
    if (token === 'mock.suspended.session') return send(res, 403, { message: 'Suspended account' });
    if (token === 'mock.unavailable.session') return send(res, 503, { message: 'Unavailable' });
    const key = token === 'mock.ana.session' ? 'ana' : token === 'mock.bob.session' ? 'bob' : null;
    return key ? send(res, 200, users[key]) : send(res, 401, { message: 'Invalid or expired session' });
  }
  if (req.method === 'POST' && path === '/api/v1/auth/logout') {
    if ((req.headers.cookie || '').includes('mock.unavailable.session')) return send(res, 503, { message: 'Unavailable' });
    // Like Nest, logout removes the cookie but does not revoke copied JWTs.
    return send(res, 204, undefined, { 'Set-Cookie': 'jwt=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure' });
  }
  send(res, 501, { message: 'This auth simulation does not model this endpoint.' });
}).listen(process.env.PORT || 4500);
