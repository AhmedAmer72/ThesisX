export const WALLET_DISCONNECT_KEY = "thesisx_wallet_disconnected";

export const WALLET_PREFERENCE_EVENT = "thesisx-wallet-preference-change";

export function notifyWalletPreferenceChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WALLET_PREFERENCE_EVENT));
  }
}
