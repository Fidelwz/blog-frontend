import { createStore } from "zustand/vanilla";

export type SessionNotice = "expired" | "suspended" | null;
export interface AuthUiState {
  userMenuOpen: boolean;
  sessionNotice: SessionNotice;
  setMenuOpen: (open: boolean) => void;
  setNotice: (notice: SessionNotice) => void;
  dismissNotice: () => void;
  reset: () => void;
}

/** One instance per provider. Identity and credentials never belong here. */
export function createAuthUiStore(notice: SessionNotice = null) {
  return createStore<AuthUiState>()(set => ({
    userMenuOpen: false,
    sessionNotice: notice,
    setMenuOpen: userMenuOpen => set({ userMenuOpen }),
    setNotice: sessionNotice => set({ sessionNotice }),
    dismissNotice: () => set({ sessionNotice: null }),
    reset: () => set({ userMenuOpen: false, sessionNotice: null }),
  }));
}
export type AuthUiStore = ReturnType<typeof createAuthUiStore>;
