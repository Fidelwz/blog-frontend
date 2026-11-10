import { test } from "node:test";
import assert from "node:assert/strict";
import { installUnsavedChanges } from "../src/lib/navigation/unsaved-changes.ts";

// Models same-document traversals and propagation. Real Next/browser interaction
// is covered separately by test/publication-recovery-smoke.cjs in the backend.
function browserFixture() {
  const target = new EventTarget(), document = new EventTarget();
  const entries = [{ state: { __NA: true } as Record<string, unknown>, url: "https://blog.example.test/inicio" }];
  let index = 0, prompts = 0, accepted = false;
  const goCalls: number[] = [];
  const location = new URL(entries[0].url);
  const history = {
    get state() { return entries[index].state; },
    pushState(state: Record<string, unknown>, _unused: string, url?: string | URL | null) {
      entries.splice(++index); entries.push({ state, url: new URL(url ?? location.href, location).href }); location.href = entries[index].url;
    },
    replaceState(state: Record<string, unknown>, _unused: string, url?: string | URL | null) {
      entries[index] = { state, url: new URL(url ?? location.href, location).href }; location.href = entries[index].url;
    },
    go(delta: number) {
      goCalls.push(delta); index += delta; location.href = entries[index].url;
      const event = new Event("popstate"); Object.defineProperty(event, "state", { value: entries[index].state }); target.dispatchEvent(event);
    },
  };
  const browser = Object.assign(target, { document, history, location, setTimeout, clearTimeout, confirm: () => { prompts++; return accepted; } });
  return { browser: browser as unknown as Window, entries, history, location, goCalls,
    prompts: () => prompts, accept: (value: boolean) => { accepted = value; } };
}

test("cancelar Atrás/Adelante restaura la posición sin duplicar entradas ni propagar a Next", () => {
  const f = browserFixture();
  const originalPush = f.history.pushState;
  const stop = installUnsavedChanges(f.browser, () => true);
  f.history.pushState({ __NA: true, tree: "next-tree" }, "", "/publicaciones/nueva");
  let delivered = 0;
  f.browser.addEventListener("popstate", () => { delivered++; });
  f.history.go(-1);
  assert.equal(f.location.pathname, "/publicaciones/nueva");
  assert.equal(delivered, 0);
  assert.equal(f.entries.length, 2);
  assert.equal(f.history.state.tree, "next-tree");
  assert.deepEqual(f.goCalls, [-1, 1]);
  f.accept(true); f.history.go(-1);
  assert.equal(f.location.pathname, "/inicio");
  assert.equal(delivered, 1);
  f.accept(false); f.history.go(1);
  assert.equal(f.location.pathname, "/inicio");
  assert.equal(delivered, 1);
  assert.equal(f.entries.length, 2);
  assert.equal(f.prompts(), 3);
  stop(); assert.equal(f.history.pushState, originalPush);
});

test("enlaces internos y formularios externos al editor piden confirmación; pestaña nueva y hash no", () => {
  const f = browserFixture();
  const stop = installUnsavedChanges(f.browser, () => true);
  function click(path: string, target = "", ctrlKey = false) {
    const url = new URL(path, f.location);
    const link = { href: url.href, origin: url.origin, target, hasAttribute: () => false };
    const event = new Event("click", { cancelable: true });
    Object.defineProperties(event, { button: { value: 0 }, ctrlKey: { value: ctrlKey }, target: { value: { closest: () => link } } });
    f.browser.document.dispatchEvent(event); return event;
  }
  assert.equal(click("/buscar").defaultPrevented, true);
  assert.equal(click("/buscar", "_blank").defaultPrevented, false);
  assert.equal(click("/buscar", "", true).defaultPrevented, false);
  assert.equal(click("#contenido").defaultPrevented, false);
  assert.equal(f.prompts(), 1);
  for (const editor of [true, false]) {
    const event = new Event("submit", { cancelable: true });
    Object.defineProperty(event, "target", { value: { hasAttribute: () => editor, target: "" } });
    f.browser.document.dispatchEvent(event);
    assert.equal(event.defaultPrevented, !editor);
  }
  assert.equal(f.prompts(), 2);
  stop();
});

test("recargar/cerrar advierte únicamente mientras hay borrador; guardar o limpiar retira el bloqueo", () => {
  const f = browserFixture(); let dirty = true;
  const stop = installUnsavedChanges(f.browser, () => dirty);
  const before = new Event("beforeunload", { cancelable: true }); f.browser.dispatchEvent(before);
  assert.equal(before.defaultPrevented, true);
  dirty = false;
  const after = new Event("beforeunload", { cancelable: true }); f.browser.dispatchEvent(after);
  assert.equal(after.defaultPrevented, false);
  f.history.pushState({ __NA: true }, "", "/buscar"); f.history.go(-1);
  assert.equal(f.prompts(), 0);
  stop(); dirty = true;
  const cleaned = new Event("beforeunload", { cancelable: true }); f.browser.dispatchEvent(cleaned);
  assert.equal(cleaned.defaultPrevented, false);
});

test("los fragmentos nativos también cuentan para restaurar saltos del historial", () => {
  const f = browserFixture();
  const nativePush = f.history.pushState;
  const stop = installUnsavedChanges(f.browser, () => true);
  nativePush({}, "", "#contenido");
  f.browser.dispatchEvent(new Event("hashchange"));
  f.history.pushState({ __NA: true }, "", "/publicaciones/nueva");
  f.history.go(-2);
  assert.equal(f.location.pathname, "/publicaciones/nueva");
  assert.deepEqual(f.goCalls, [-2, 2]);
  assert.equal(f.entries.length, 3);
  assert.equal(f.prompts(), 1);
  stop();
});
