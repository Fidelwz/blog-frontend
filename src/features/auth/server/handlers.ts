import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "../../../lib/api/client.ts";
import { invalidatesSession } from "../session-errors.ts";
import { isEmail, isResetToken, passwordRules } from "../../../lib/validation.ts";
import { accountBackend } from "./account-backend.ts";
import { readJson } from "./request-body.ts";
import { authError, backendAuth, backendUser } from "./backend.ts";
import { readSessionCookie, sessionCookieOptions, SESSION_COOKIE, validCookieValue } from "./cookie.ts";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
  return response;
}

export function errorResponse(error: unknown, clearInvalidSession = false) {
  const status = error instanceof ApiError ? error.status : 502;
  const message = error instanceof ApiError ? error.message : "No pudimos completar la solicitud. Inténtalo de nuevo.";
  const response = json({ statusCode: status, message, error: error instanceof ApiError ? error.code : "UpstreamError",
    ...(error instanceof ApiError ? { idCorrelacion: error.correlationId, retryAfter: error.retryAfter } : {}) }, status);
  if (error instanceof ApiError && error.correlationId) response.headers.set("X-Request-ID", error.correlationId);
  if (error instanceof ApiError && status === 429 && error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
  return clearInvalidSession && invalidatesSession(error) ? clearSession(response) : response;
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw authError(403, "La solicitud de acceso no proviene de este sitio. Recarga la página e inténtalo de nuevo.");
  }
}

async function loginBody(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw authError(415, "La solicitud debe enviarse en formato JSON.");
  }
  // Bound the request even when Content-Length is missing or misleading.
  const reader = request.body?.getReader();
  if (!reader) throw authError(400, "Completa el correo y la contraseña.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw authError(413, "La solicitud es demasiado grande."); }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw authError(400, "La solicitud no contiene JSON válido."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw authError(400, "Completa el correo y la contraseña.");
  const data = body as Record<string, unknown>;
  if (Object.keys(data).some(key => key !== "email" && key !== "password") ||
      typeof data.email !== "string" || !isEmail(data.email.trim()) ||
      typeof data.password !== "string" || !data.password) {
    throw authError(400, "Revisa el correo y la contraseña ingresados.");
  }
  return { email: data.email.trim().toLowerCase(), password: data.password };
}

export async function login(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const upstream = await backendAuth("login", { credentials: await loginBody(request) });
    const user = await backendUser(upstream);
    const cookie = readSessionCookie(upstream.headers.getSetCookie());
    const response = json(user);
    response.cookies.set(SESSION_COOKIE, cookie.value, { ...sessionCookieOptions(), maxAge: cookie.maxAge, expires: cookie.expires });
    return response;
  } catch (error) { return errorResponse(error); }
}

export async function me(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie || !validCookieValue(cookie)) throw authError(401, "Inicia sesión para continuar.");
    return json(await backendUser(await backendAuth("me", { cookie })));
  } catch (error) { return errorResponse(error, true); }
}

export async function logout(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (cookie && validCookieValue(cookie)) await backendAuth("logout", { cookie });
    return clearSession(new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) { return errorResponse(error); }
}

export async function register(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, ["firstName", "lastName", "email", "password"]);
    for (const key of ["firstName", "lastName"] as const) {
      const value = body[key];
      if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 80) {
        throw authError(400, "Escribe entre 2 y 80 caracteres para nombre y apellido.");
      }
      body[key] = value.trim();
    }
    if (typeof body.email !== "string" || !isEmail(body.email.trim()) ||
        typeof body.password !== "string" || !passwordRules(body.password).every(Boolean)) {
      throw authError(400, "Revisa el correo y los requisitos de la contraseña.");
    }
    body.email = body.email.trim().toLowerCase();
    try {
      const upstream = await accountBackend("/auth/register", { method: "POST", body, expectedStatus: 201,
        messages: { 409: "Ya existe una cuenta con ese correo." } });
      await upstream.body?.cancel();
      return json({ message: "Cuenta creada. Inicia sesión." }, 201);
    } finally { body.password = ""; }
  } catch (error) { return errorResponse(error); }
}

export async function forgotPassword(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, ["email"]);
    if (typeof body.email !== "string" || !isEmail(body.email.trim())) throw authError(400, "Escribe un correo electrónico válido.");
    const upstream = await accountBackend("/auth/forgot-password", {
      method: "POST", body: { email: body.email.trim().toLowerCase() }, expectedStatus: 202,
    });
    await upstream.body?.cancel();
    return json({ message: "Si existe una cuenta con ese correo, recibirás instrucciones." }, 202);
  } catch (error) { return errorResponse(error); }
}

export async function resetPassword(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, ["token", "newPassword"]);
    try {
      const invalidLink = "El enlace no es válido o ya venció. Solicita uno nuevo.";
      if (typeof body.token !== "string" || !isResetToken(body.token)) throw authError(410, invalidLink);
      if (typeof body.newPassword !== "string" || !passwordRules(body.newPassword).every(Boolean)) {
        throw authError(400, "Revisa los requisitos de la contraseña.");
      }
      await accountBackend("/auth/reset-password", { method: "POST", body, expectedStatus: 204, messages: { 410: invalidLink } });
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
    } finally { body.token = ""; body.newPassword = ""; }
  } catch (error) { return errorResponse(error); }
}
