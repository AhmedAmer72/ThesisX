const SESSION_KEY = "thesisx_wallet_session";

export function getStoredSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredSession(token: string | null): void {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, token);
}
