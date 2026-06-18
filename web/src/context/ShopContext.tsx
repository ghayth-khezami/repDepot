"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import { AuthUser, CartItem, Category, ClientProfile, Product } from "@/types";

interface ShopContextValue {
  categories: Category[];
  cart: CartItem[];
  token: string | null;
  user: AuthUser | null;
  /** True after client has read token/user from storage (avoid flash redirect on /profile). */
  authHydrated: boolean;
  client: ClientProfile | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string, intent?: "CLIENT" | "DEPOSER") => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  verifyRegister: (email: string, code: string) => Promise<void>;
  logout: () => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQty: (productId: string, qty: number) => void;
  ensureClient: (profile?: Partial<ClientProfile>) => Promise<ClientProfile>;
  likedById: Record<string, boolean>;
  syncLikesForProducts: (productIds: string[]) => Promise<void>;
  toggleLike: (productId: string) => Promise<"added" | "removed" | false>;
  isLiked: (productId: string) => boolean;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  // Important: avoid hydration mismatches by reading localStorage only after mount.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    setCart(storage.getCart());
    setToken(storage.getToken());
    setUser(storage.getUser());
    setClient(storage.getClient());
    setAuthHydrated(true);
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [cats] = await Promise.all([api.getCategories()]);
      setCategories(cats ?? []);
    } catch {
      // API may be offline in dev; keep UI usable.
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    storage.setToken(res.access_token);
    storage.setUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, username?: string) => {
    await api.register(email, password, username);
  };

  const googleLogin = async (idToken: string, intent?: "CLIENT" | "DEPOSER") => {
    const res = await api.googleLogin(idToken, intent);
    storage.setToken(res.access_token);
    storage.setUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
  };

  const verifyRegister = async (email: string, code: string) => {
    const res = await api.verifyRegister(email, code);
    storage.setToken(res.access_token);
    storage.setUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    storage.clearToken();
    storage.clearUser();
    storage.clearClient();
    setToken(null);
    setUser(null);
    setClient(null);
    setLikedById({});
  };

  const persistCart = (next: CartItem[]) => {
    setCart(next);
    storage.setCart(next);
  };

  const addToCart = (product: Product) => {
    if (cart.some((it) => it.product.id === product.id)) return;
    persistCart([...cart, { product, quantity: 1 }]);
    toast.success("Ajouté au panier", {
      description: `${product.productName} est dans votre panier.`,
    });
  };

  const removeFromCart = (productId: string) => {
    persistCart(cart.filter((it) => it.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    persistCart(cart.map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it)));
  };

  const clearCart = () => {
    setCart([]);
    storage.clearCart();
  };

  const ensureClient = async (profile?: Partial<ClientProfile>) => {
    if (!token || !user) throw new Error("Authentication required");
    if (client) return client;

    const fromSearch = await api.findClients(token, user.email);
    const existing = fromSearch.data.find((c) => c.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      setClient(existing);
      storage.setClient(existing);
      return existing;
    }

    const payload = {
      firstName: profile?.firstName || "Client",
      lastName: profile?.lastName || user.username || "Depot",
      address: profile?.address || "Adresse a renseigner",
      email: user.email,
      phoneNumber: (profile?.phoneNumber || "00000000").replace(/\D/g, "").slice(0, 8),
    };
    const created = await api.createClient(token, payload);
    setClient(created);
    storage.setClient(created);
    return created;
  };

  const syncLikesForProducts = useCallback(async (productIds: string[]) => {
    const t = storage.getToken();
    const unique = [...new Set(productIds)].filter(Boolean);
    if (!t || unique.length === 0) return;
    const chunk = 80;
    try {
      for (let i = 0; i < unique.length; i += chunk) {
        const slice = unique.slice(i, i + chunk);
        const { likedIds } = await api.checkLikedProducts(t, slice);
        const set = new Set(likedIds);
        setLikedById((prev) => {
          const next = { ...prev };
          for (const id of slice) {
            if (set.has(id)) next[id] = true;
            else delete next[id];
          }
          return next;
        });
      }
    } catch {
      // hors ligne ou non auth
    }
  }, []);

  const toggleLike = useCallback(async (productId: string) => {
    const t = storage.getToken();
    if (!t) {
      toast.error("Connexion requise", {
        description: "Connectez-vous pour enregistrer vos articles préférés.",
      });
      return false;
    }
    const wasLiked = !!likedById[productId];
    try {
      if (wasLiked) {
        await api.unlikeProduct(t, productId);
        setLikedById((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        toast.success("Retiré des favoris", {
          description: "Ce produit n’est plus dans Articles préférés.",
        });
        return "removed";
      }
      await api.likeProduct(t, productId);
      setLikedById((prev) => ({ ...prev, [productId]: true }));
      toast.success("Ajouté à la liste des produits préférés", {
        description: "Retrouvez-le dans Articles préférés.",
      });
      return "added";
    } catch {
      toast.error("Impossible de mettre à jour les favoris.");
      return false;
    }
  }, [likedById]);

  const isLiked = useCallback((productId: string) => !!likedById[productId], [likedById]);

  const value = {
    categories,
    cart,
    token,
    user,
    authHydrated,
    client,
    loading,
    refreshData,
    login,
    googleLogin,
    register,
    verifyRegister,
    logout,
    addToCart,
    removeFromCart,
    clearCart,
    updateQty,
    ensureClient,
    likedById,
    syncLikesForProducts,
    toggleLike,
    isLiked,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
