const TOKEN_KEY = "web_token";
const USER_KEY = "web_user";
const CLIENT_KEY = "web_client";
const CART_KEY = "web_cart";

export const storage = {
  getToken: () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getUser: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(USER_KEY),

  getClient: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(CLIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setClient: (client: unknown) => localStorage.setItem(CLIENT_KEY, JSON.stringify(client)),
  clearClient: () => localStorage.removeItem(CLIENT_KEY),

  getCart: () => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  setCart: (cart: unknown) => localStorage.setItem(CART_KEY, JSON.stringify(cart)),
  clearCart: () => localStorage.removeItem(CART_KEY),
};
