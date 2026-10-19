import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";
import { calculateProductPrice } from "../utils/price";

export interface CartItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  thumbnail?: string | null;
  quantity: number;
  stock: number;
}

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  discount_percent?: string | number | null;
  stock: string | number;
  thumbnail?: string | null;
}

interface ApiProductResponse {
  success: boolean;
  data: ApiProduct;
}

const CART_STORAGE_KEY = "pharmacy-shop-cart";
const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeStock(stock: number): number {
  if (!Number.isFinite(stock)) return 0;
  return Math.max(0, Math.floor(stock));
}

function normalizeQuantity(quantity: number, stock: number): number {
  const safeStock = normalizeStock(stock);
  if (safeStock <= 0) return 0;
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(Math.floor(quantity), safeStock));
}

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return [];

      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item): item is CartItem =>
            item !== null &&
            typeof item === "object" &&
            Number.isFinite(Number(item.id)) &&
            typeof item.name === "string" &&
            typeof item.slug === "string" &&
            Number.isFinite(Number(item.price)) &&
            Number.isFinite(Number(item.quantity)) &&
            Number.isFinite(Number(item.stock)),
        )
        .map((item) => {
          const stock = normalizeStock(Number(item.stock));
          return {
            ...item,
            id: Number(item.id),
            price: Math.max(0, Number(item.price)),
            stock,
            quantity: normalizeQuantity(Number(item.quantity), stock),
          };
        })
        .filter((item) => item.quantity > 0);
    } catch {
      return [];
    }
  });

  const cartProductKeys = items
    .map((item) => `${item.id}:${item.slug}`)
    .sort()
    .join("|");

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep the cart usable if browser storage is unavailable or full.
    }
  }, [items]);

  useEffect(() => {
    if (!cartProductKeys) return;

    let cancelled = false;
    const currentItems = items;

    const refreshCartProducts = async () => {
      const results = await Promise.allSettled(
        currentItems.map(async (item) => {
          const response = await api.get<ApiProductResponse>(
            `/products/${encodeURIComponent(item.slug)}`,
          );

          return {
            cartItemId: item.id,
            product: response.data.data,
          };
        }),
      );

      if (cancelled) return;

      setItems((latestItems) =>
        latestItems.flatMap((item) => {
          const resultIndex = currentItems.findIndex(
            (currentItem) =>
              currentItem.id === item.id && currentItem.slug === item.slug,
          );

          if (resultIndex === -1) return [item];

          const result = results[resultIndex];
          if (result.status === "rejected") return [item];

          const product = result.value.product;
          const productPrice = Number(product?.price);
          const productStock = Number(product?.stock);

          if (
            !product ||
            Number(product.id) !== item.id ||
            !Number.isFinite(productPrice) ||
            productPrice < 0 ||
            !Number.isFinite(productStock)
          ) {
            return [item];
          }

          const pricing = calculateProductPrice(
            productPrice,
            product.discount_percent ?? 0,
          );
          const stock = normalizeStock(productStock);
          const quantity = normalizeQuantity(item.quantity, stock);

          // Remove items that are no longer in stock instead of retaining
          // an impossible quantity in the cart.
          if (quantity === 0) return [];

          return [
            {
              ...item,
              name: product.name,
              slug: product.slug,
              price: pricing.finalPrice,
              originalPrice: pricing.originalPrice,
              discountPercent: pricing.discountPercent,
              thumbnail: product.thumbnail ?? item.thumbnail,
              stock,
              quantity,
            },
          ];
        }),
      );
    };

    void refreshCartProducts();

    return () => {
      cancelled = true;
    };
    // Refresh only when the set of products in the cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartProductKeys]);

  const addToCart = (product: Omit<CartItem, "quantity">) => {
    const stock = normalizeStock(Number(product.stock));
    const price = Number(product.price);

    if (stock <= 0 || !Number.isFinite(price) || price < 0) return;

    const safeProduct: Omit<CartItem, "quantity"> = {
      ...product,
      id: Number(product.id),
      price,
      stock,
    };

    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === safeProduct.id);

      if (existing) {
        const quantity = normalizeQuantity(existing.quantity + 1, stock);
        if (quantity === 0) return currentItems;

        return currentItems.map((item) =>
          item.id === safeProduct.id
            ? { ...item, ...safeProduct, quantity }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          ...safeProduct,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    setItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== id) return [item];

        const safeQuantity = normalizeQuantity(quantity, item.stock);
        return safeQuantity > 0 ? [{ ...item, quantity: safeQuantity }] : [];
      }),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const cartTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

export default CartProvider;
