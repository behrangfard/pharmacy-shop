import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";
import { calculateProductPrice } from "../utils/price";
import { STORAGE_KEYS } from "../utils/storageKeys";

const CART_STORAGE_KEY = STORAGE_KEYS.cart;

export interface CartPackColor {
  /** نام قطعهٔ پک */
  name: string;
  /** رنگ انتخاب‌شده برای همان قطعه */
  color: string;
}

export interface CartItem {
  // شناسه اصلی محصول؛ برای ثبت سفارش استفاده می‌شود.
  id: number;
  name: string;
  slug: string;

  // شناسه تنوع انتخاب‌شده؛ برای محصولات بدون تنوع null است.
  variant_id?: number | null;
  variant_name?: string | null;

  // رنگ انتخاب‌شدهٔ محصول؛ برای محصولات بدون رنگ null است.
  color_name?: string | null;

  // رنگ هر قطعهٔ پک چندعددی.
  pack_colors?: CartPackColor[] | null;

  sku?: string | null;

  price: number;
  originalPrice?: number;
  discountPercent?: number;
  thumbnail?: string;
  quantity: number;
  stock: number;
  is_taxable: boolean;

  // شناسه یکتای ردیف سبد خرید
  cartKey: string;
}

type AddToCartItem = Omit<CartItem, "quantity" | "cartKey">;

type CartIdentity = number | string;

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: AddToCartItem) => void;
  removeFromCart: (identity: CartIdentity) => void;
  updateQuantity: (identity: CartIdentity, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

function getCartKey(
  productId: number,
  variantId?: number | null,
  colorName?: string | null,
  packColors?: CartPackColor[] | null,
) {
  /*
   * هر ترکیب محصول + تنوع + رنگ یک ردیف مستقل است؛ بنابراین مشتری می‌تواند
   * دو رنگ از یک محصول را جداگانه در سبد داشته باشد.
   */
  const colorPart = (colorName ?? "").trim();
  const packPart = (packColors ?? [])
    .map((entry) => `${entry.name}=${entry.color}`)
    .sort()
    .join("|");

  return `${productId}:${variantId ?? "null"}:${colorPart}:${packPart}`;
}

function readStoredCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is CartItem =>
          item &&
          typeof item.id === "number" &&
          typeof item.name === "string" &&
          typeof item.slug === "string" &&
          typeof item.price === "number" &&
          typeof item.quantity === "number",
      )
      .map((item) => ({
        ...item,
        variant_id: item.variant_id ?? null,
        variant_name: item.variant_name ?? null,
        color_name: item.color_name ?? null,
        pack_colors: Array.isArray(item.pack_colors) ? item.pack_colors : null,
        sku: item.sku ?? null,
        stock: Number(item.stock ?? 0),
        is_taxable: item.is_taxable ?? true,
        cartKey:
          item.cartKey ||
          getCartKey(
            item.id,
            item.variant_id ?? null,
            item.color_name ?? null,
            item.pack_colors ?? null,
          ),
      }));
  } catch {
    return [];
  }
}

function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  // ذخیره خودکار سبد خرید
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Cart storage error:", error);
    }
  }, [items]);

  // افزودن یک واحد از محصول یا تنوع انتخاب‌شده
  const addToCart = useCallback((product: AddToCartItem) => {
    const variantId = product.variant_id ?? null;
    const colorName = (product.color_name ?? "").trim() || null;
    const packColors = product.pack_colors ?? null;
    const cartKey = getCartKey(product.id, variantId, colorName, packColors);

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.cartKey === cartKey,
      );

      if (existingItem) {
        if (existingItem.quantity >= existingItem.stock) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.stock),
              }
            : item,
        );
      }

      if (product.stock <= 0) {
        return currentItems;
      }

      return [
        ...currentItems,
        {
          ...product,
          variant_id: variantId,
          variant_name: product.variant_name ?? null,
          color_name: colorName,
          pack_colors: packColors,
          sku: product.sku ?? null,
          quantity: 1,
          cartKey,
          is_taxable: product.is_taxable ?? true,
        },
      ];
    });
  }, []);

  // حذف ردیف بر اساس cartKey؛ عدد برای سازگاری با کدهای قبلی است.
  const removeFromCart = useCallback((identity: CartIdentity) => {
    setItems((currentItems) =>
      currentItems.filter((item) => {
        if (typeof identity === "string") {
          return item.cartKey !== identity;
        }

        return item.id !== identity;
      }),
    );
  }, []);

  // تغییر تعداد یک ردیف مشخص
  const updateQuantity = useCallback(
    (identity: CartIdentity, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(identity);
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) => {
          const matches =
            typeof identity === "string"
              ? item.cartKey === identity
              : item.id === identity && !item.variant_id;

          if (!matches) {
            return item;
          }

          return {
            ...item,
            quantity: Math.min(Math.floor(quantity), item.stock),
          };
        }),
      );
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // تازه‌سازی قیمت و موجودی از سرور
  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshCart = async () => {
      const uniqueSlugs = Array.from(new Set(items.map((item) => item.slug)));

      const productResults = await Promise.allSettled(
        uniqueSlugs.map(async (slug) => {
          const response = await api.get(`/products/${slug}`);
          return response.data?.data;
        }),
      );

      if (cancelled) {
        return;
      }

      const productsBySlug = new Map<string, Record<string, any>>();

      productResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          productsBySlug.set(uniqueSlugs[index], result.value);
        }
      });

      if (productsBySlug.size === 0) {
        return;
      }

      setItems((currentItems) => {
        let changed = false;

        const refreshedItems = currentItems
          .map((item) => {
            const product = productsBySlug.get(item.slug);

            if (!product) {
              return item;
            }

            const variant =
              item.variant_id != null
                ? (product.variants || []).find(
                    (entry: any) =>
                      Number(entry.id) === Number(item.variant_id),
                  )
                : null;

            // اگر تنوع حذف یا غیرفعال شده باشد، آن ردیف حذف می‌شود.
            if (item.variant_id != null && (!variant || !variant.is_active)) {
              changed = true;
              return null;
            }

            const stock = Number(variant ? variant.stock : product.stock);

            // موجودی صفر؛ ردیف دیگر قابل خرید نیست.
            if (stock <= 0) {
              changed = true;
              return null;
            }

            const basePrice =
              variant?.price != null
                ? Number(variant.price)
                : Number(product.price);

            const pricing = calculateProductPrice(
              basePrice,
              product.discount_percent,
            );

            const thumbnail =
              variant?.image || product.thumbnail || item.thumbnail;

            const updatedItem: CartItem = {
              ...item,
              name: product.name || item.name,
              price: Number(pricing.finalPrice),
              originalPrice: Number(pricing.originalPrice),
              discountPercent: Number(pricing.discountPercent),
              thumbnail,
              stock,
              quantity: Math.min(item.quantity, stock),
              is_taxable:
                typeof product.is_taxable === "boolean"
                  ? product.is_taxable
                  : item.is_taxable,
              variant_name: variant?.name ?? item.variant_name ?? null,
              sku: variant?.sku ?? product.sku ?? item.sku ?? null,
            };

            if (
              updatedItem.price !== item.price ||
              updatedItem.stock !== item.stock ||
              updatedItem.quantity !== item.quantity ||
              updatedItem.thumbnail !== item.thumbnail ||
              updatedItem.variant_name !== item.variant_name ||
              updatedItem.sku !== item.sku ||
              updatedItem.is_taxable !== item.is_taxable
            ) {
              changed = true;
            }

            return updatedItem;
          })
          .filter((item): item is CartItem => item !== null);

        return changed ? refreshedItems : currentItems;
      });
    };

    refreshCart().catch((error) => {
      console.error("Cart refresh error:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [items.length]);

  const cartCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const cartTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  const contextValue = useMemo(
    () => ({
      items,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

export default CartProvider;
