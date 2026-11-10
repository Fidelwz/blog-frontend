const positionKey = "__blogHistoryPosition";

/** Preserve Next's history state; restore a cancelled traversal before its
 * popstate listener can unmount the form. No duplicate sentinel entries. */
export function installUnsavedChanges(browser: Window, dirty: () => boolean) {
  const history = browser.history;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  const position = (state: unknown): number | undefined => {
    if (!state || typeof state !== "object") return undefined;
    const value = (state as Record<string, unknown>)[positionKey];
    return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
  };
  let current = position(history.state) ?? 0;
  let currentUrl = browser.location.href;
  let restoring: number | undefined;
  let skipUnload = false;
  let skipTimer: number | undefined;
  const stamp = (state: unknown, value: number) => ({ ...(state && typeof state === "object" ? state : {}), [positionKey]: value });
  originalReplace.call(history, stamp(history.state, current), "");
  const push: History["pushState"] = function (state, unused, url) {
    originalPush.call(history, stamp(state, current + 1), unused, url);
    current++; currentUrl = browser.location.href;
  };
  const replace: History["replaceState"] = function (state, unused, url) {
    originalReplace.call(history, stamp(state, current), unused, url);
    currentUrl = browser.location.href;
  };
  history.pushState = push;
  history.replaceState = replace;
  const confirm = () => !dirty() || browser.confirm("Tienes cambios sin guardar o un guardado por comprobar. ¿Salir y descartar el borrador de esta pestaña?");
  const samePage = (a: string, b: string) => {
    const left = new URL(a), right = new URL(b);
    return left.origin === right.origin && left.pathname === right.pathname && left.search === right.search;
  };
  const unload = (event: BeforeUnloadEvent) => {
    if (dirty() && !skipUnload) { event.preventDefault(); event.returnValue = ""; }
  };
  const confirmEvent = (event: Event) => {
    if (!confirm()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    // A plain anchor/form may unload the document in this same event. Avoid two
    // prompts; a later unload still warns if SPA navigation was cancelled.
    skipUnload = true;
    browser.clearTimeout(skipTimer);
    skipTimer = browser.setTimeout(() => { skipUnload = false; }, 0);
  };
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || link.origin !== browser.location.origin || samePage(link.href, currentUrl)) return;
    confirmEvent(event);
  };
  const submit = (event: SubmitEvent) => {
    const form = event.target as HTMLFormElement;
    if (event.defaultPrevented || form.hasAttribute("data-draft-form") || (form.target && form.target !== "_self")) return;
    confirmEvent(event);
  };
  const pop = (event: PopStateEvent) => {
    const destination = position(event.state);
    if (restoring !== undefined) {
      event.stopImmediatePropagation();
      if (destination === restoring) restoring = undefined;
      else if (destination !== undefined) history.go(restoring - destination);
      return;
    }
    if (destination !== undefined && !samePage(browser.location.href, currentUrl) && !confirm()) {
      event.stopImmediatePropagation();
      restoring = current;
      history.go(current - destination);
      return;
    }
    // Cross-document traversals use beforeunload, not this same-document path.
    current = destination ?? current;
    currentUrl = browser.location.href;
  };
  const hash = () => {
    // Native fragment links create entries without calling pushState. Count
    // them too so a later cancelled traversal restores the exact editor entry.
    if (restoring !== undefined || browser.location.href === currentUrl) return;
    current++;
    originalReplace.call(history, stamp(history.state, current), "");
    currentUrl = browser.location.href;
  };
  browser.addEventListener("beforeunload", unload);
  browser.addEventListener("popstate", pop, true);
  browser.addEventListener("hashchange", hash);
  browser.document.addEventListener("click", click, true);
  browser.document.addEventListener("submit", submit, true);
  return () => {
    browser.removeEventListener("beforeunload", unload);
    browser.removeEventListener("popstate", pop, true);
    browser.removeEventListener("hashchange", hash);
    browser.document.removeEventListener("click", click, true);
    browser.document.removeEventListener("submit", submit, true);
    browser.clearTimeout(skipTimer);
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
  };
}
