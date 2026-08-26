export const CART_CHANGED = 'cart:changed';

/** Notify the nav (and any other listeners) that cart contents or the active session changed. */
export function notifyCartChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_CHANGED));
  }
}
