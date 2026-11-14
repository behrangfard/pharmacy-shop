import { Check, ChevronDown, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * پنل فیلتر مشترک صفحهٔ محصولات.
 *
 * هر دو نما (سایدبار دسکتاپ و کشوی موبایل) همین کامپوننت را رندر می‌کنند تا
 * چیدمان و فاصله‌ها یکسان بماند. هر بخش یک آکاردئون مستقل است و هیچ‌کدام
 * اسکرول داخلی ندارند؛ فهرست‌های بلند دسته‌بندی/برند با «۸ مورد اول + نمایش
 * همه» کوتاه می‌شوند تا فقط اسکرول صفحه (یا کشو) کار کند. بخش‌های دارای فیلتر
 * فعال با شمارنده مشخص و به‌صورت خودکار باز می‌شوند.
 */

export interface FilterCategory {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
}

export interface FilterBrand {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
}

export interface FilterSize {
  value: string;
  count: number;
}

export interface FilterPricePreset {
  label: string;
  min: string;
  max: string;
}

export type FilterFlagKey = "inStock" | "discount" | "isNew" | "featured";

interface ProductFilterPanelProps {
  categories: FilterCategory[];
  categoriesLoading: boolean;
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;

  brands: FilterBrand[];
  brandsLoading: boolean;
  selectedBrands: string[];
  onToggleBrand: (slug: string) => void;
  onClearBrands: () => void;

  sizes: FilterSize[];
  selectedSizes: string[];
  onToggleSize: (size: string) => void;

  priceMinBound: number | null;
  priceMaxBound: number | null;
  minPriceDraft: string;
  maxPriceDraft: string;
  onChangeMinPriceDraft: (value: string) => void;
  onChangeMaxPriceDraft: (value: string) => void;
  onApplyPriceRange: (min?: string, max?: string) => void;
  priceError: string;
  pricePresets: FilterPricePreset[];
  /** بازهٔ فعال (اعمال‌شده) برای مشخص‌کردن میان‌بر انتخاب‌شده. */
  activeMinPrice: string;
  activeMaxPrice: string;

  flags: Record<FilterFlagKey, boolean>;
  onToggleFlag: (key: FilterFlagKey) => void;

  sort: string;
  sortOptions: [string, string][];
  onSortChange: (value: string) => void;

  hasFilters: boolean;
  onClearFilters: () => void;

  /** تعداد نتایج فعلی برای دکمهٔ «نمایش نتایج» در کشوی موبایل. */
  resultCount?: number;

  /** نمایش دکمهٔ بستن (فقط در کشوی موبایل). */
  onClose?: () => void;
}

/** تعداد آیتم‌های پیش‌نمایش در فهرست‌های بلند (دسته‌بندی/برند). */
const LIST_PREVIEW_COUNT = 8;

/** عدد قیمت را با جداکنندهٔ هزارگان فارسی نمایش می‌دهد. */
function formatPrice(value: string): string {
  const amount = Number(value);

  return value !== "" && Number.isFinite(amount)
    ? amount.toLocaleString("fa-IR")
    : value;
}

const FLAG_OPTIONS: { key: FilterFlagKey; label: string }[] = [
  { key: "inStock", label: "موجود" },
  { key: "discount", label: "تخفیف‌دار" },
  { key: "isNew", label: "جدید" },
  { key: "featured", label: "پیشنهاد ویژه" },
];

/**
 * یک بخش تاشو (آکاردئون) در پنل فیلتر.
 *
 * هر بخش مستقل از بقیه باز/بسته می‌شود تا چند فهرست بلند پشت‌سرهم، پنل را
 * شلوغ نکنند. بدنه هیچ‌وقت اسکرول داخلی ندارد؛ فهرست‌های بلند با «۸ مورد
 * اول + نمایش همه» کوتاه می‌شوند تا فقط اسکرول صفحه کار کند. اگر بخشی فیلتر
 * فعال داشته باشد (`badge > 0`) خودکار باز می‌شود تا فیلترِ اعمال‌شده پنهان نماند.
 */
function FilterSection({
  title,
  action,
  badge = 0,
  defaultOpen = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  badge?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  useEffect(() => {
    if (badge > 0) {
      setOpen(true);
    }
  }, [badge]);

  return (
    <section className="border-t border-line/60 first:border-t-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5 text-right"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] font-black tracking-wide text-ink-soft">
              {title}
            </span>

            {badge > 0 && (
              <span className="flex h-4 min-w-4 flex-none items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white">
                {badge.toLocaleString("fa-IR")}
              </span>
            )}
          </span>

          <ChevronDown
            size={14}
            className={`flex-none text-muted-soft transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {action && <div className="flex-none">{action}</div>}
      </div>

      <div
        id={bodyId}
        aria-hidden={!open}
        className={`grid transition-all duration-200 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-3" inert={!open}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** دکمهٔ ریز «نمایش همه / نمایش کمتر» برای فهرست‌های بلند. */
function ListToggle({
  expanded,
  hiddenCount,
  onClick,
}: {
  expanded: boolean;
  hiddenCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 w-full rounded-lg px-2 py-1.5 text-[10px] font-bold text-brand-550 transition hover:bg-cream hover:text-brand-700"
    >
      {expanded
        ? "نمایش کمتر"
        : `نمایش همه (${(hiddenCount).toLocaleString("fa-IR")})`}
    </button>
  );
}

/** لینک ریز «حذف» کنار عنوان بخش. */
function ClearLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold text-brand-550 transition hover:text-brand-700"
    >
      {label}
    </button>
  );
}

function ProductFilterPanel({
  categories,
  categoriesLoading,
  selectedCategory,
  onSelectCategory,
  brands,
  brandsLoading,
  selectedBrands,
  onToggleBrand,
  onClearBrands,
  sizes,
  selectedSizes,
  onToggleSize,
  priceMinBound,
  priceMaxBound,
  minPriceDraft,
  maxPriceDraft,
  onChangeMinPriceDraft,
  onChangeMaxPriceDraft,
  onApplyPriceRange,
  priceError,
  pricePresets,
  activeMinPrice,
  activeMaxPrice,
  flags,
  onToggleFlag,
  sort,
  sortOptions,
  onSortChange,
  hasFilters,
  onClearFilters,
  resultCount,
  onClose,
}: ProductFilterPanelProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");

  const normalizedBrandQuery = brandQuery.trim().toLowerCase();

  const filteredBrands = normalizedBrandQuery
    ? brands.filter((brand) =>
        brand.name.toLowerCase().includes(normalizedBrandQuery),
      )
    : brands;

  /*
   * تا وقتی «نمایش همه» زده نشده فقط ۸ برند اول نمایش داده می‌شود، اما
   * برندهای انتخاب‌شده همیشه دیده می‌شوند تا حذفشان سخت نشود.
   */
  const visibleBrands =
    showAllBrands || normalizedBrandQuery !== ""
      ? filteredBrands
      : filteredBrands.filter(
          (brand, index) =>
            index < LIST_PREVIEW_COUNT || selectedBrands.includes(brand.slug),
        );

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, LIST_PREVIEW_COUNT);

  const activeFlagCount = FLAG_OPTIONS.reduce(
    (count, option) => (flags[option.key] ? count + 1 : count),
    0,
  );

  const priceActive = activeMinPrice !== "" || activeMaxPrice !== "";

  /* دستهٔ انتخاب‌شدهٔ خارج از ۸ مورد اول را خودکار نمایان می‌کنیم. */
  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    const index = categories.findIndex(
      (category) => category.slug === selectedCategory,
    );

    if (index >= LIST_PREVIEW_COUNT) {
      setShowAllCategories(true);
    }
  }, [selectedCategory, categories]);

  return (
    <div>
      {onClose && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-cream px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-ink-soft">
            <SlidersHorizontal size={13} />
            فیلتر محصولات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-brand-550 transition hover:text-brand-700"
          >
            بستن
          </button>
        </div>
      )}

      <FilterSection
        title="دسته‌بندی"
        defaultOpen
        badge={selectedCategory ? 1 : 0}
        action={
          selectedCategory ? (
            <ClearLink label="حذف" onClick={() => onSelectCategory("")} />
          ) : undefined
        }
      >
        {categoriesLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-brand-550" />
          </div>
        ) : (
          <div className="-mx-1 space-y-px px-1">
            <button
              type="button"
              onClick={() => onSelectCategory("")}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-right text-[13px] leading-5 transition ${
                !selectedCategory
                  ? "bg-brand-100 font-bold text-brand-700"
                  : "font-medium text-muted hover:bg-cream hover:text-brand-700"
              }`}
            >
              <span>همه محصولات</span>
            </button>

            {visibleCategories.map((category) => {
              const active = selectedCategory === category.slug;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(category.slug)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-right text-[13px] leading-5 transition ${
                    active
                      ? "bg-brand-100 font-bold text-brand-700"
                      : "font-medium text-muted hover:bg-cream hover:text-brand-700"
                  }`}
                >
                  <span className="truncate">{category.name}</span>

                  {category.products_count !== undefined && (
                    <span className="flex-none text-[10px] text-muted-soft">
                      {category.products_count.toLocaleString("fa-IR")}
                    </span>
                  )}
                </button>
              );
            })}

            {categories.length > LIST_PREVIEW_COUNT && (
              <ListToggle
                expanded={showAllCategories}
                hiddenCount={categories.length}
                onClick={() => setShowAllCategories((value) => !value)}
              />
            )}
          </div>
        )}
      </FilterSection>

      <FilterSection
        title="برند"
        badge={selectedBrands.length}
        action={
          selectedBrands.length > 0 ? (
            <ClearLink
              label={`حذف (${selectedBrands.length.toLocaleString("fa-IR")})`}
              onClick={onClearBrands}
            />
          ) : undefined
        }
      >
        {brandsLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-brand-550" />
          </div>
        ) : brands.length === 0 ? (
          <p className="text-[11px] leading-5 text-muted-soft">
            برندی برای نمایش نیست.
          </p>
        ) : (
          <div className="-mx-1 px-1">
            {brands.length > LIST_PREVIEW_COUNT && (
              <div className="relative mb-1.5">
                <Search
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-soft"
                />

                <input
                  type="text"
                  value={brandQuery}
                  onChange={(event) => setBrandQuery(event.target.value)}
                  placeholder="جستجوی برند..."
                  aria-label="جستجوی برند"
                  className="h-8 w-full rounded-lg border border-line bg-cream pr-7 pl-2 text-[11px] outline-none transition focus:border-brand-500 focus:bg-white"
                />
              </div>
            )}

            {visibleBrands.length === 0 ? (
              <p className="px-1 py-2 text-[11px] leading-5 text-muted-soft">
                برندی با این نام پیدا نشد.
              </p>
            ) : (
              <div className="space-y-px">
                {visibleBrands.map((brand) => {
                  const checked = selectedBrands.includes(brand.slug);

                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => onToggleBrand(brand.slug)}
                      aria-pressed={checked}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-right transition hover:bg-cream"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition ${
                            checked
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-line-strong bg-white text-transparent"
                          }`}
                        >
                          <Check size={11} strokeWidth={3.5} />
                        </span>

                        <span
                          className={`truncate text-[13px] leading-5 ${
                            checked
                              ? "font-bold text-brand-700"
                              : "font-medium text-muted"
                          }`}
                        >
                          {brand.name}
                        </span>
                      </span>

                      {brand.products_count !== undefined && (
                        <span className="flex-none text-[10px] text-muted-soft">
                          {brand.products_count.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {normalizedBrandQuery === "" &&
              filteredBrands.length > LIST_PREVIEW_COUNT && (
                <ListToggle
                  expanded={showAllBrands}
                  hiddenCount={filteredBrands.length}
                  onClick={() => setShowAllBrands((value) => !value)}
                />
              )}
          </div>
        )}
      </FilterSection>

      <FilterSection title="سایز" badge={selectedSizes.length}>
        {sizes.length === 0 ? (
          <p className="text-[11px] leading-5 text-muted-soft">
            سایزی برای نمایش نیست.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size) => {
              const checked = selectedSizes.includes(size.value);

              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onToggleSize(size.value)}
                  aria-pressed={checked}
                  title={`${size.count.toLocaleString("fa-IR")} محصول`}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    checked
                      ? "bg-brand-500 text-white"
                      : "bg-cream text-muted hover:bg-brand-100 hover:text-brand-700"
                  }`}
                >
                  {size.value}
                  <span
                    className={`text-[9px] ${
                      checked ? "text-white/70" : "text-muted-soft"
                    }`}
                  >
                    {size.count.toLocaleString("fa-IR")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </FilterSection>

      <FilterSection
        title="محدودهٔ قیمت (تومان)"
        badge={priceActive ? 1 : 0}
        action={
          priceActive ? (
            <ClearLink label="حذف" onClick={() => onApplyPriceRange("", "")} />
          ) : undefined
        }
      >
        <p className="mb-2 text-[10px] leading-4 text-muted-soft">
          {priceMinBound != null && priceMaxBound != null
            ? `بازهٔ فعلی: ${formatPrice(String(priceMinBound))} تا ${formatPrice(
                String(priceMaxBound),
              )} تومان`
            : "برای محدودکردن نتایج، بازه را وارد کنید."}
        </p>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={minPriceDraft}
            onChange={(event) => onChangeMinPriceDraft(event.target.value)}
            onBlur={() => onApplyPriceRange()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onApplyPriceRange();
              }
            }}
            placeholder="از"
            aria-label="کمترین قیمت"
            className="h-9 w-full min-w-0 rounded-lg border border-line bg-cream px-2.5 text-xs outline-none transition focus:border-brand-500 focus:bg-white"
          />

          <span className="text-[11px] text-line-strong">—</span>

          <input
            type="text"
            inputMode="numeric"
            value={maxPriceDraft}
            onChange={(event) => onChangeMaxPriceDraft(event.target.value)}
            onBlur={() => onApplyPriceRange()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onApplyPriceRange();
              }
            }}
            placeholder="تا"
            aria-label="بیشترین قیمت"
            className="h-9 w-full min-w-0 rounded-lg border border-line bg-cream px-2.5 text-xs outline-none transition focus:border-brand-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={() => onApplyPriceRange()}
            className="h-9 flex-none rounded-lg bg-brand-100 px-2.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-250"
          >
            اعمال
          </button>
        </div>

        {priceError && (
          <p className="mt-1.5 text-[10px] font-bold text-gold">{priceError}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {pricePresets.map((preset) => {
            const active =
              activeMinPrice === preset.min && activeMaxPrice === preset.max;

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onApplyPriceRange(preset.min, preset.max)}
                className={`rounded-full px-2 py-1 text-[10px] font-bold transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-cream text-muted hover:bg-brand-100 hover:text-brand-700"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="ویژگی‌ها" badge={activeFlagCount}>
        <div className="grid grid-cols-2 gap-1.5">
          {FLAG_OPTIONS.map((option) => {
            const active = flags[option.key];

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onToggleFlag(option.key)}
                aria-pressed={active}
                className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-cream text-muted hover:bg-brand-100 hover:text-brand-700"
                }`}
              >
                {option.label}
                {active && <Check size={11} strokeWidth={3.5} />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="مرتب‌سازی" defaultOpen>
        <div className="relative">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="مرتب‌سازی محصولات"
            className="h-9 w-full appearance-none rounded-lg border border-line bg-white px-2.5 pl-7 text-[12px] font-bold text-ink outline-none transition focus:border-brand-500"
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-soft"
          />
        </div>
      </FilterSection>

      {hasFilters && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <button
            type="button"
            onClick={onClearFilters}
            className="w-full rounded-lg border border-blush-100 bg-blush-50 py-2 text-[11px] font-bold text-discount transition hover:bg-blush-100"
          >
            پاک کردن همهٔ فیلترها
          </button>
        </div>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 w-full rounded-xl bg-brand-500 py-2.5 text-[12px] font-black text-white transition hover:bg-brand-700"
        >
          {resultCount != null
            ? `نمایش ${resultCount.toLocaleString("fa-IR")} محصول`
            : "نمایش نتایج"}
        </button>
      )}
    </div>
  );
}

export default ProductFilterPanel;
