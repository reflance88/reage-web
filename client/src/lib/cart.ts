export type CartItem = {
  productId: string;
  quantity: number;
};

const CART_STORAGE_KEY = "reage_cart";

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === "string"
    && typeof item.quantity === "number"
    && Number.isInteger(item.quantity)
    && item.quantity > 0;
}

export function normalizeCart(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  const merged = new Map<string, number>();
  for (const item of items) {
    if (!isValidCartItem(item)) continue;
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? normalizeCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCart(items)));
}

export function addToCart(productId: string, quantity = 1) {
  if (!productId || quantity <= 0) return loadCart();
  const next = normalizeCart([...loadCart(), { productId, quantity }]);
  saveCart(next);
  return next;
}

export function clearCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
}
