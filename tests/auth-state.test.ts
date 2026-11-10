import { test } from "node:test";
import assert from "node:assert/strict";
import { dehydrate, hydrate, QueryObserver } from "@tanstack/react-query";
import { createQueryClient } from "../src/lib/query/client.ts";
import { createAuthUiStore } from "../src/features/auth/store.ts";
import { acquireAuthMutation, isAuthMutationActive, releaseAuthMutation, replaceSession, sessionKey } from "../src/features/auth/cache.ts";
import { sessionOptions } from "../src/features/auth/query-options.ts";
import { createAuthApi } from "../src/features/auth/api.ts";
import type { AuthSession, AuthUser } from "../src/features/auth/types.ts";

const user: AuthUser = { id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role: "usuario", status: "activo", photoUrl: null };
const authenticated: AuthSession = { status: "authenticated", user };
const anonymous: AuthSession = { status: "anonymous", user: null };

test("Zustand aísla instancias y reinicia solo estado de interfaz", () => {
  const a = createAuthUiStore("expired"), b = createAuthUiStore();
  a.getState().setMenuOpen(true);
  assert.equal(b.getState().userMenuOpen, false);
  assert.equal(b.getState().sessionNotice, null);
  assert.deepEqual(Object.keys(a.getState()).sort(), ["dismissNotice", "reset", "sessionNotice", "setMenuOpen", "setNotice", "userMenuOpen"]);
  a.getState().reset();
  assert.equal(a.getState().userMenuOpen, false);
  assert.equal(a.getState().sessionNotice, null);
});

test("logout cancela /me tardío y limpia datos privados conservando los públicos", async () => {
  const client = createQueryClient();
  client.setQueryData(sessionKey, authenticated);
  client.setQueryData(["publications", "public"], ["public"]);
  await client.fetchQuery({ queryKey: ["profile", 42], queryFn: () => "private", meta: { private: true } });
  let resolve!: (value: AuthSession) => void;
  let signal!: AbortSignal;
  const late = client.fetchQuery({ ...sessionOptions(), staleTime: 0, queryFn: context => {
    signal = context.signal;
    return new Promise<AuthSession>(done => { resolve = done; });
  } }).catch(() => undefined);
  await replaceSession(client, anonymous);
  assert.equal(signal.aborted, true);
  resolve(authenticated);
  await late;
  assert.deepEqual(client.getQueryData(sessionKey), anonymous);
  assert.equal(client.getQueryData(["profile", 42]), undefined);
  assert.deepEqual(client.getQueryData(["publications", "public"]), ["public"]);
  client.clear();
});

test("SSR aísla usuarios y una hidratación antigua no reemplaza una sesión nueva", () => {
  const first = createQueryClient(), second = createQueryClient();
  first.setQueryData(sessionKey, authenticated, { updatedAt: 100 });
  second.setQueryData(sessionKey, anonymous, { updatedAt: 200 });
  hydrate(second, dehydrate(first));
  assert.deepEqual(first.getQueryData(sessionKey), authenticated);
  assert.deepEqual(second.getQueryData(sessionKey), anonymous);
  first.clear(); second.clear();
});

test("dos consumidores comparten consulta y una hidratación fresca no pide /me", async () => {
  const client = createQueryClient();
  client.setQueryData(sessionKey, authenticated);
  let calls = 0;
  let complete!: (value: AuthSession) => void;
  const options = { ...sessionOptions(), queryFn: () => {
    calls++;
    return new Promise<AuthSession>(resolve => { complete = resolve; });
  } };
  const first = new QueryObserver(client, options), second = new QueryObserver(client, options);
  const offA = first.subscribe(() => {}), offB = second.subscribe(() => {});
  assert.equal(calls, 0);
  const a = first.refetch(), b = second.refetch({ cancelRefetch: false });
  assert.equal(calls, 1);
  complete(authenticated);
  await Promise.all([a, b]);
  assert.deepEqual(first.getCurrentResult().data, second.getCurrentResult().data);
  offA(); offB(); client.clear();
});

test("fallo de red conserva identidad previa y no reintenta automáticamente", async () => {
  const client = createQueryClient();
  client.setQueryData(sessionKey, authenticated);
  let calls = 0;
  await assert.rejects(client.fetchQuery({ ...sessionOptions(), staleTime: 0, queryFn: () => {
    calls++; throw new Error("offline");
  } }));
  assert.equal(calls, 1);
  assert.deepEqual(client.getQueryData(sessionKey), authenticated);
  client.clear();
});

test("el bloqueo de mutaciones es inmediato y queda aislado por cliente", () => {
  const a = createQueryClient(), b = createQueryClient();
  assert.equal(acquireAuthMutation(a), true);
  assert.equal(acquireAuthMutation(a), false);
  assert.equal(isAuthMutationActive(a), true);
  assert.equal(acquireAuthMutation(b), true);
  releaseAuthMutation(a);
  assert.equal(isAuthMutationActive(a), false);
  assert.equal(acquireAuthMutation(a), true);
  releaseAuthMutation(a); releaseAuthMutation(b);
  a.clear(); b.clear();
});

test("el transporte distingue 401/403 de red y limpia credenciales en éxito y error", async () => {
  for (const status of [200, 401, 403, 503]) {
    let sent: RequestInit | undefined;
    const api = createAuthApi(async (_url, init) => {
      sent = init;
      return Response.json(status === 200 ? user : { message: "error", error: status === 403 ? "AccountSuspended" : "AuthError" }, { status });
    });
    const credentials = { email: user.email, password: "TestPassword123!" };
    if (status === 200) assert.deepEqual(await api.login(credentials), user);
    else await assert.rejects(api.login(credentials));
    assert.deepEqual(credentials, { email: "", password: "" });
    assert.equal(sent?.credentials, "include");
    assert.equal(JSON.parse(sent!.body as string).password, "TestPassword123!");
    if (status === 503) await assert.rejects(api.fetchSession());
    else assert.equal((await api.fetchSession()).status, status === 200 ? "authenticated" : status === 401 ? "anonymous" : "suspended");
  }
  const controller = new AbortController();
  const api = createAuthApi(async (_url, init) => {
    assert.equal(init?.signal?.aborted, true);
    throw new DOMException("Aborted", "AbortError");
  });
  controller.abort();
  await assert.rejects(api.fetchSession(controller.signal));
});
