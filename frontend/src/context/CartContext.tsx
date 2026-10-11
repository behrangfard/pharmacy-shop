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
  stock: number;
  thumbnail?: string | null;
}

interface ApiProductResponse {
  success: boolean;
  data: ApiProduct;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("pharmacy-shop-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cartProductKeys = items
    .map((item) => `${item.id}:${item.slug}`)
    .sort()
    .join("|");

  useEffect(() => {
    localStorage.setItem("pharmacy-shop-cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!cartProductKeys) {
      return;
    }

    let cancelled = false;

    const refreshCartProducts = async () => {
      const currentItems = items;

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

      if (cancelled) {
        return;
      }

      setItems((latestItems) =>
        latestItems.map((item) => {
          const resultIndex = currentItems.findIndex(
            (currentItem) =>
              currentItem.id === item.id && currentItem.slug === item.slug,
          );

          if (resultIndex === -1) {
            return item;
          }

          const result = results[resultIndex];

          if (result.status === "rejected") {
            return item;
          }

          const product = result.value.product;

          if (
            !product ||
            product.id !== item.id ||
            !Number.isFinite(Number(product.price)) ||
            !Number.isFinite(Number(product.stock))
          ) {
            return item;
          }

          const pricing = calculateProductPrice(
            product.price,
            product.discount_percent ?? 0,
          );

          const stock = Math.max(0, Math.floor(Number(product.stock)));

          return {
            ...item,
            name: product.name,
            slug: product.slug,
            price: pricing.finalPrice,
            originalPrice: pricing.originalPrice,
            discountPercent: pricing.discountPercent,
            thumbnail: product.thumbnail ?? item.thumbnail,
            stock,
            quantity:
              stock > 0 ? Math.min(item.quantity, stock) : item.quantity,
          };
        }),
      );
    };

    void refreshCartProducts();

    return () => {
      cancelled = true;
    };
    // The key changes only when a product is added or removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartProductKeys]);

  const addToCart = (product: Omit<CartItem, "quantity">) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === product.id);

      if (existing) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...product,
                quantity: Math.min(item.quantity + 1, product.stock),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          ...product,
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
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, Math.min(Math.floor(quantity), item.stock)),
            }
          : item,
      ),
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
