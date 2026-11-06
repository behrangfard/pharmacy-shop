import { FormEvent, useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import AdminProductSizeGuideEditor from "../components/AdminProductSizeGuideEditor";
import { adminApi } from "../services/api";
import { API_ORIGIN } from "../utils/images";
import {
  emptyProductSizeGuide,
  hasProductSizeGuideContent,
  parseProductSizeGuide,
  type ProductSizeGuide,
} from "../utils/productSizeGuide";



interface Category {

  id: number;

  name: string;

  children?: Category[];

}



interface Brand {

  id: number;

  name: string;

}



interface ProductImage {

  id: number;

  product_id: number;

  path: string;

  alt: string | null;

  sort_order: number;

  is_primary: boolean;

}



interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  /** سایز نرمال‌شدهٔ تنوع؛ اگر در پنل خالی بماند از نام تنوع استخراج می‌شود. */
  size: string | null;
  sku: string;
  price: string | number | null;
  compare_price: string | number | null;
  stock: number;
  image: string | null;
  is_active: boolean;
}

interface ProductVariantForm {
  id?: number;
  name: string;
  size: string;
  sku: string;
  price: string;
  compare_price: string;
  stock: string;
  image: string;
  is_active: boolean;
}

interface Product {

  id: number;

  category_id: number;

  brand_id: number | null;

  name: string;

  slug: string;

  sku: string;

  short_description: string | null;

  description: string | null;

  price: string | number;

  compare_price: string | number | null;

  discount_percent: number;

  stock: number;

  weight: string | number | null;

  thumbnail: string | null;

  is_active: boolean;

  is_featured: boolean;

  is_new: boolean;

  is_taxable: boolean;

  meta_title: string | null;

  meta_description: string | null;

  images?: ProductImage[];

  /** تنوع‌های محصول؛ فقط در دریافت تک‌محصول از پنل برگردانده می‌شود. */
  variants?: ProductVariant[];

  /** راهنمای سایز اختصاصی همین محصول */
  size_guide?: unknown;

}



interface ProductFormData {

  category_id: string;

  brand_id: string;

  name: string;

  slug: string;

  sku: string;

  short_description: string;

  description: string;

  price: string;

  compare_price: string;

  discount_percent: string;

  stock: string;

  weight: string;

  thumbnail: string;

  is_active: boolean;

  is_featured: boolean;

  is_new: boolean;

  is_taxable: boolean;

  meta_title: string;

  meta_description: string;

}



/* آدرس ریشه بک‌اند از ../utils/images خوانده می‌شود. */



const emptyForm: ProductFormData = {

  category_id: "",

  brand_id: "",

  name: "",

  slug: "",

  sku: "",

  short_description: "",

  description: "",

  price: "",

  compare_price: "",

  discount_percent: "0",

  stock: "0",

  weight: "",

  thumbnail: "",

  is_active: true,

  is_featured: false,

  is_new: false,

  is_taxable: false,

  meta_title: "",

  meta_description: "",

};



const fieldStyle = {

  width: "100%",

  boxSizing: "border-box" as const,

  border: "1px solid #d1d5db",

  borderRadius: "9px",

  padding: "11px 12px",

  fontFamily: "inherit",

  fontSize: "14px",

  background: "#fff",

  color: "#111827",

};



const labelStyle = {

  display: "block",

  fontSize: "13px",

  fontWeight: 700,

  marginBottom: "7px",

  color: "#374151",

};



const sectionStyle = {

  background: "#fff",

  border: "1px solid #e5e7eb",

  borderRadius: "14px",

  padding: "20px",

  marginBottom: "18px",

};



function readProduct(product: Product): ProductFormData {

  return {

    category_id: String(product.category_id ?? ""),

    brand_id: product.brand_id ? String(product.brand_id) : "",

    name: product.name ?? "",

    slug: product.slug ?? "",

    sku: product.sku ?? "",

    short_description: product.short_description ?? "",

    description: product.description ?? "",

    price: String(product.price ?? ""),

    compare_price:

      product.compare_price === null || product.compare_price === undefined

        ? ""

        : String(product.compare_price),

    discount_percent: String(product.discount_percent ?? 0),

    stock: String(product.stock ?? 0),

    weight:

      product.weight === null || product.weight === undefined

        ? ""

        : String(product.weight),

    thumbnail: product.thumbnail ?? "",

    is_active: Boolean(product.is_active),

    is_featured: Boolean(product.is_featured),

    is_new: Boolean(product.is_new),

    is_taxable: Boolean(product.is_taxable),

    meta_title: product.meta_title ?? "",

    meta_description: product.meta_description ?? "",

  };

}



function imageUrl(path: string | null | undefined): string {

  if (!path) return "";



  const value = path.trim();

  if (!value) return "";



  if (/^https?:\/\//i.test(value)) {

    return value;

  }



  if (value.startsWith("/")) {

    return `${API_ORIGIN}${value}`;

  }



  if (value.startsWith("storage/")) {

    return `${API_ORIGIN}/${value}`;

  }



  return `${API_ORIGIN}/storage/${value.replace(/^\/+/, "")}`;

}



function AdminProductForm() {

  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const isEdit = Boolean(id);



  const [form, setForm] = useState<ProductFormData>(emptyForm);

  const [categories, setCategories] = useState<Category[]>([]);

  const [brands, setBrands] = useState<Brand[]>([]);

  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariantForm[]>([]);

  /** راهنمای سایز اختصاصی همین محصول (جدا از راهنمای سایز عمومی سایت) */
  const [sizeGuide, setSizeGuide] = useState<ProductSizeGuide>(emptyProductSizeGuide);

  const [sizeGuideUploading, setSizeGuideUploading] = useState(false);

  const [sizeGuideUploadError, setSizeGuideUploadError] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [uploadingImages, setUploadingImages] = useState(false);

  const [imageBusyId, setImageBusyId] = useState<number | null>(null);

  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});



  useEffect(() => {

    let cancelled = false;



    async function loadFormData() {

      try {

        setLoading(true);

        setError("");



        const requests = [adminApi.get("/categories"), adminApi.get("/brands")];



        if (isEdit && id) {

          const [categoryResponse, brandResponse, productResponse] =

            await Promise.all([...requests, adminApi.get(`/admin/products/${id}`)]);



          if (cancelled) return;



          const categoryData = categoryResponse.data.data;

          const brandData = brandResponse.data.data;

          const productData = productResponse.data.data as Product;



          setCategories(Array.isArray(categoryData) ? categoryData : []);

          setBrands(Array.isArray(brandData) ? brandData : []);

          setForm(readProduct(productData));

          // تنوع‌های ذخیره‌شده باید به فرم برگردند؛ بک‌اند تنوع‌های ارسال‌نشده را
          // غیرفعال می‌کند، پس خالی‌ماندن این لیست یعنی غیرفعال‌شدن همهٔ تنوع‌ها.
          setVariants(
            (productData.variants ?? []).map((variant) => ({
              id: variant.id,
              name: variant.name,
              size: variant.size ?? "",
              sku: variant.sku,
              price: String(variant.price ?? ""),
              compare_price: String(variant.compare_price ?? ""),
              stock: String(variant.stock ?? 0),
              image: variant.image ?? "",
              is_active: variant.is_active,
            })),
          );

          setSizeGuide(
            parseProductSizeGuide(productData.size_guide) ??
              emptyProductSizeGuide(),
          );

          setImages(

            [...(productData.images ?? [])].sort(

              (a, b) => a.sort_order - b.sort_order,

            ),

          );

        } else {

          const [categoryResponse, brandResponse] = await Promise.all(requests);



          if (cancelled) return;



          const categoryData = categoryResponse.data.data;

          const brandData = brandResponse.data.data;



          setCategories(Array.isArray(categoryData) ? categoryData : []);

          setBrands(Array.isArray(brandData) ? brandData : []);

          setForm({ ...emptyForm });

          setVariants([]);

          setImages([]);

          setSizeGuide(emptyProductSizeGuide());

        }

      } catch (err: any) {

        if (cancelled) return;



        setError(

          err?.response?.data?.message ||

            "دریافت اطلاعات فرم ناموفق بود. اتصال سرور و دسترسی مدیر را بررسی کنید.",

        );

      } finally {

        if (!cancelled) setLoading(false);

      }

    }



    void loadFormData();



    return () => {

      cancelled = true;

    };

  }, [id, isEdit]);



  function updateField<K extends keyof ProductFormData>(

    key: K,

    value: ProductFormData[K],

  ) {

    setForm((current) => ({ ...current, [key]: value }));



    setFieldErrors((current) => {

      const next = { ...current };

      delete next[key];

      return next;

    });

  }



  function updateVariant<K extends keyof ProductVariantForm>(
    index: number,
    key: K,
    value: ProductVariantForm[K],
  ) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    );
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        name: "",
        size: "",
        sku: "",
        price: "",
        compare_price: "",
        stock: "0",
        image: "",
        is_active: true,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((current) =>
      current.flatMap((variant, variantIndex) => {
        if (variantIndex !== index) return [variant];
        // Existing variants are retained and deactivated to preserve order history.
        return variant.id ? [{ ...variant, is_active: false }] : [];
      }),
    );
  }

  function getFieldError(key: string) {

    return fieldErrors[key]?.[0] ?? "";

  }



  async function refreshProductImages() {

    if (!id) return;



    const response = await adminApi.get(`/admin/products/${id}`);

    const productData = response.data.data as Product;



    setImages(

      [...(productData.images ?? [])].sort(

        (a, b) => a.sort_order - b.sort_order,

      ),

    );



    setForm((current) => ({

      ...current,

      thumbnail: productData.thumbnail ?? "",

    }));

  }



  /**
   * بارگذاری تصویر «نحوهٔ اندازه‌گیری» راهنمای سایز همین محصول.
   *
   * مستقل از شناسهٔ محصول است تا هنگام ساخت محصول جدید هم کار کند و مسیر
   * ذخیره‌شده در فرم قرار می‌گیرد.
   */
  async function handleSizeGuideImageUpload(
    file: File,
  ): Promise<string | null> {

    setSizeGuideUploadError("");

    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {

      setSizeGuideUploadError(
        "فرمت تصویر مجاز نیست؛ JPG، PNG یا WebP انتخاب کنید.",
      );

      return null;

    }

    if (file.size > 5 * 1024 * 1024) {

      setSizeGuideUploadError("حجم تصویر بیشتر از ۵ مگابایت است.");

      return null;

    }

    const body = new FormData();

    body.append("file", file);

    try {

      setSizeGuideUploading(true);

      const response = await adminApi.post(
        "/admin/products/size-guide-image",
        body,
      );

      const path = response.data?.data?.path;

      return typeof path === "string" && path !== "" ? path : null;

    } catch (err: any) {

      setSizeGuideUploadError(
        err?.response?.data?.message ||
          "بارگذاری تصویر ناموفق بود. اتصال سرور و دسترسی مدیر را بررسی کنید.",
      );

      return null;

    } finally {

      setSizeGuideUploading(false);

    }

  }

  async function handleImageUpload() {

    if (!id) {

      setError(

        "ابتدا محصول را ذخیره کنید و سپس از صفحه ویرایش، تصاویر را اضافه کنید.",

      );

      return;

    }



    if (selectedFiles.length === 0) {

      setError("ابتدا حداقل یک تصویر انتخاب کنید.");

      return;

    }



    if (selectedFiles.length > 10) {

      setError("در هر مرحله حداکثر ۱۰ تصویر انتخاب کنید.");

      return;

    }



    const allowedExtensions = /\.(jpe?g|png|webp)$/i;

    const maxFileSize = 5 * 1024 * 1024;



    for (const file of selectedFiles) {

      if (!allowedExtensions.test(file.name)) {

        setError(

          `فرمت فایل «${file.name}» مجاز نیست. JPG، PNG یا WebP انتخاب کنید.`,

        );

        return;

      }



      if (file.size > maxFileSize) {

        setError(`حجم فایل «${file.name}» بیشتر از ۵ مگابایت است.`);

        return;

      }

    }



    const formData = new FormData();



    selectedFiles.forEach((file) => {

      formData.append("images[]", file);

    });



    try {

      setError("");

      setUploadingImages(true);



      await adminApi.post(`/admin/products/${id}/images`, formData);

      await refreshProductImages();



      setSelectedFiles([]);

      setError("");

    } catch (err: any) {

      setError(

        err?.response?.data?.message ||

          "آپلود تصاویر ناموفق بود. اتصال سرور، فرمت فایل‌ها و دسترسی مدیر را بررسی کنید.",

      );

    } finally {

      setUploadingImages(false);

    }

  }



  async function handleSetPrimary(image: ProductImage) {

    if (!id) return;



    try {

      setError("");

      setImageBusyId(image.id);



      await adminApi.patch(`/admin/products/${id}/images/${image.id}/primary`);



      await refreshProductImages();

    } catch (err: any) {

      setError(err?.response?.data?.message || "تغییر تصویر اصلی ناموفق بود.");

    } finally {

      setImageBusyId(null);

    }

  }



  async function handleDeleteImage(image: ProductImage) {

    if (!id) return;



    const confirmed = window.confirm(

      "آیا از حذف این تصویر اطمینان دارید؟ این عملیات قابل بازگشت نیست.",

    );



    if (!confirmed) return;



    try {

      setError("");

      setImageBusyId(image.id);



      await adminApi.delete(`/admin/products/${id}/images/${image.id}`);



      await refreshProductImages();

    } catch (err: any) {

      setError(err?.response?.data?.message || "حذف تصویر ناموفق بود.");

    } finally {

      setImageBusyId(null);

    }

  }



  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setError("");

    setFieldErrors({});



    const price = Number(form.price);

    const stock = Number(form.stock);

    const discount = Number(form.discount_percent);



    if (!form.name.trim()) {

      setError("وارد کردن نام محصول الزامی است.");

      return;

    }



    if (!form.category_id) {

      setError("لطفاً دسته‌بندی محصول را انتخاب کنید.");

      return;

    }



    if (!form.sku.trim()) {

      setError("وارد کردن کد محصول الزامی است.");

      return;

    }



    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) {

      setError("قیمت محصول باید یک عدد معتبر و غیرمنفی باشد.");

      return;

    }



    if (!Number.isInteger(stock) || stock < 0) {

      setError("موجودی باید عدد صحیح و غیرمنفی باشد.");

      return;

    }



    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {

      setError("درصد تخفیف باید بین صفر تا صد باشد.");

      return;

    }



    const activeVariants = variants.filter((variant) => variant.is_active);

    for (const [index, variant] of activeVariants.entries()) {
      if (!variant.name.trim()) {
        setError(`نام تنوع شماره ${index + 1} را وارد کنید.`);
        return;
      }

      if (!variant.sku.trim()) {
        setError(`کد SKU تنوع «${variant.name}» را وارد کنید.`);
        return;
      }

      if (!Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0) {
        setError(`موجودی تنوع «${variant.name}» باید عدد صحیح و غیرمنفی باشد.`);
        return;
      }

      if (variant.price.trim() !== "" && (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0)) {
        setError(`قیمت تنوع «${variant.name}» معتبر نیست.`);
        return;
      }

      if (variant.compare_price.trim() !== "" && (!Number.isFinite(Number(variant.compare_price)) || Number(variant.compare_price) < 0)) {
        setError(`قیمت قبل از تخفیف تنوع «${variant.name}» معتبر نیست.`);
        return;
      }
    }

    const activeSkus = activeVariants.map((variant) => variant.sku.trim().toLowerCase());
    if (new Set(activeSkus).size !== activeSkus.length) {
      setError("کد SKU تنوع‌های فعال نباید تکراری باشد.");
      return;
    }

    const variantsPayload = variants
      .filter((variant) => Boolean(variant.id) || variant.is_active)
      .map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      name: variant.name.trim(),
      size: variant.size.trim() || null,
      sku: variant.sku.trim(),
      price: variant.price.trim() === "" ? null : Number(variant.price),
      compare_price: variant.compare_price.trim() === "" ? null : Number(variant.compare_price),
      stock: Number(variant.stock),
      image: variant.image.trim() || null,
      is_active: variant.is_active,
    }));

    const payload = {
      variants: variantsPayload,

      category_id: Number(form.category_id),

      brand_id: form.brand_id ? Number(form.brand_id) : null,

      name: form.name.trim(),

      sku: form.sku.trim(),

      short_description: form.short_description.trim() || null,

      description: form.description.trim() || null,

      price,

      compare_price:

        form.compare_price.trim() === "" ? null : Number(form.compare_price),

      discount_percent: discount,

      stock,

      weight: form.weight.trim() === "" ? null : Number(form.weight),

      thumbnail: form.thumbnail.trim() || null,

      is_active: form.is_active,

      is_featured: form.is_featured,

      is_new: form.is_new,

      is_taxable: form.is_taxable,

      meta_title: form.meta_title.trim() || null,

      meta_description: form.meta_description.trim() || null,

      /*
       * راهنمای سایز اختصاصی محصول فقط وقتی ارسال می‌شود که محتوا داشته
       * باشد یا محصول در حال ویرایش باشد (تا حذف کامل راهنما هم ممکن باشد).
       */
      ...(isEdit || hasProductSizeGuideContent(sizeGuide)
        ? { size_guide: sizeGuide }
        : {}),

      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),

    };



    if (

      payload.compare_price !== null &&

      (!Number.isFinite(payload.compare_price) || payload.compare_price < 0)

    ) {

      setError("قیمت قبل از تخفیف باید عدد معتبر و غیرمنفی باشد.");

      return;

    }



    if (

      payload.weight !== null &&

      (!Number.isFinite(payload.weight) || payload.weight < 0)

    ) {

      setError("وزن باید عدد معتبر و غیرمنفی باشد.");

      return;

    }



    try {

      setSaving(true);



      if (isEdit && id) {

        await adminApi.put(`/admin/products/${id}`, payload);

      } else {

        await adminApi.post("/admin/products", payload);

      }



      navigate("/admin/products", {

        state: {

          notice: isEdit

            ? "محصول با موفقیت ویرایش شد."

            : "محصول جدید با موفقیت ثبت شد.",

        },

      });

    } catch (err: any) {

      const responseData = err?.response?.data;



      if (responseData?.errors) {

        setFieldErrors(responseData.errors);

      }



      setError(

        responseData?.message ||

          "ذخیره محصول ناموفق بود. اطلاعات واردشده و دسترسی مدیر را بررسی کنید.",

      );

    } finally {

      setSaving(false);

    }

  }



  const categoriesForSelect = categories.flatMap((category) => [

    { id: category.id, name: category.name },

    ...(category.children ?? []).map((child) => ({

      id: child.id,

      name: `${category.name} ← ${child.name}`,

    })),

  ]);

  /** نام تنوع‌های فعال؛ برای ساخت سریع سطرهای جدول راهنمای سایز */
  const sizeGuideVariantNames = variants
    .filter((variant) => variant.is_active)
    .map((variant) => variant.name.trim())
    .filter((name) => name !== "");



  function textField(

    key: keyof ProductFormData,

    label: string,

    options?: {

      required?: boolean;

      type?: string;

      placeholder?: string;

      min?: string;

      max?: string;

      step?: string;

    },

  ) {

    const value = form[key];



    return (

      <div>

        <label htmlFor={key} style={labelStyle}>

          {label}

          {options?.required ? " *" : ""}

        </label>



        <input

          id={key}

          type={options?.type ?? "text"}

          value={typeof value === "string" ? value : ""}

          onChange={(event) =>

            updateField(key, event.target.value as ProductFormData[typeof key])

          }

          required={options?.required}

          placeholder={options?.placeholder}

          min={options?.min}

          max={options?.max}

          step={options?.step}

          style={fieldStyle}

        />



        {getFieldError(key) && (

          <p style={{ color: "#b91c1c", fontSize: "12px", marginBottom: 0 }}>

            {getFieldError(key)}

          </p>

        )}

      </div>

    );

  }



  function textAreaField(

    key: "short_description" | "description" | "meta_description",

    label: string,

    rows = 4,

  ) {

    return (

      <div>

        <label htmlFor={key} style={labelStyle}>

          {label}

        </label>



        <textarea

          id={key}

          rows={rows}

          value={form[key]}

          onChange={(event) => updateField(key, event.target.value)}

          style={{ ...fieldStyle, resize: "vertical" }}

        />



        {getFieldError(key) && (

          <p style={{ color: "#b91c1c", fontSize: "12px", marginBottom: 0 }}>

            {getFieldError(key)}

          </p>

        )}

      </div>

    );

  }



  function checkboxField(

    key: "is_active" | "is_featured" | "is_new" | "is_taxable",

    label: string,

  ) {

    return (

      <label

        style={{

          display: "flex",

          alignItems: "center",

          gap: "9px",

          border: "1px solid #e5e7eb",

          borderRadius: "10px",

          padding: "13px",

          cursor: "pointer",

          background: "#fff",

        }}

      >

        <input

          type="checkbox"

          checked={form[key]}

          onChange={(event) => updateField(key, event.target.checked)}

        />

        <span style={{ fontSize: "14px" }}>{label}</span>

      </label>

    );

  }



  if (loading) {

    return (

      <div dir="rtl" style={{ padding: "30px", color: "#6b7280" }}>

        در حال دریافت اطلاعات فرم...

      </div>

    );

  }



  return (

    <div dir="rtl" style={{ color: "#111827", maxWidth: "1100px" }}>

      <div

        style={{

          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: "12px",

          marginBottom: "24px",

        }}

      >

        <div>

          <h1 style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: 800 }}>

            {isEdit ? "ویرایش محصول" : "افزودن محصول جدید"}

          </h1>

          <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>

            اطلاعات محصول را تکمیل کنید و سپس ذخیره کنید.

          </p>

        </div>



        <Link

          to="/admin/products"

          style={{

            textDecoration: "none",

            border: "1px solid #d1d5db",

            color: "#374151",

            borderRadius: "9px",

            padding: "10px 14px",

            fontSize: "13px",

          }}

        >

          بازگشت به محصولات

        </Link>

      </div>



      {error && (

        <div

          role="alert"

          style={{

            background: "#fef2f2",

            border: "1px solid #fecaca",

            color: "#b91c1c",

            borderRadius: "10px",

            padding: "14px 16px",

            marginBottom: "18px",

            lineHeight: 1.8,

          }}

        >

          {error}

        </div>

      )}



      <form className="admin-product-form" onSubmit={handleSubmit}>

        <section style={sectionStyle}>

          <h2 style={{ margin: "0 0 18px", fontSize: "17px" }}>

            اطلاعات اصلی محصول

          </h2>



          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",

              gap: "18px",

            }}

          >

            <div>

              <label htmlFor="category_id" style={labelStyle}>

                دسته‌بندی *

              </label>

              <select

                id="category_id"

                value={form.category_id}

                onChange={(event) =>

                  updateField("category_id", event.target.value)

                }

                required

                style={fieldStyle}

              >

                <option value="">انتخاب دسته‌بندی</option>

                {categoriesForSelect.map((category) => (

                  <option key={category.id} value={category.id}>

                    {category.name}

                  </option>

                ))}

              </select>

              {getFieldError("category_id") && (

                <p style={{ color: "#b91c1c", fontSize: "12px" }}>

                  {getFieldError("category_id")}

                </p>

              )}

            </div>



            <div>

              <label htmlFor="brand_id" style={labelStyle}>

                برند

              </label>

              <select

                id="brand_id"

                value={form.brand_id}

                onChange={(event) =>

                  updateField("brand_id", event.target.value)

                }

                style={fieldStyle}

              >

                <option value="">بدون برند</option>

                {brands.map((brand) => (

                  <option key={brand.id} value={brand.id}>

                    {brand.name}

                  </option>

                ))}

              </select>

            </div>



            {textField("name", "نام محصول", {

              required: true,

              placeholder: "مثلاً قرص ویتامین",

            })}

            {textField("sku", "کد محصول (SKU)", {

              required: true,

              placeholder: "مثلاً MED-1001",

            })}

            {textField("slug", "شناسه متنی (Slug)", {

              placeholder: "در صورت خالی بودن، خودکار ساخته می‌شود",

            })}

            {textField("thumbnail", "آدرس تصویر اصلی", {

              placeholder: "آدرس اینترنتی یا مسیر تصویر",

            })}

          </div>



          <div style={{ marginTop: "18px" }}>

            {textAreaField("short_description", "توضیح کوتاه", 2)}

          </div>



          <div style={{ marginTop: "18px" }}>

            {textAreaField("description", "توضیحات کامل محصول", 6)}

          </div>



          {form.thumbnail && (

            <div style={{ marginTop: "16px" }}>

              <p style={labelStyle}>پیش‌نمایش تصویر اصلی</p>

              <img

                src={imageUrl(form.thumbnail)}

                alt="پیش‌نمایش محصول"

                onError={(event) => {

                  event.currentTarget.style.display = "none";

                }}

                style={{

                  width: "130px",

                  height: "130px",

                  objectFit: "cover",

                  borderRadius: "10px",

                  border: "1px solid #e5e7eb",

                }}

              />

            </div>

          )}

        </section>



        <section style={sectionStyle}>

          <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>تصاویر محصول</h2>



          {isEdit && id ? (

            <>

              <p

                style={{

                  color: "#6b7280",

                  fontSize: "13px",

                  lineHeight: 1.9,

                  marginTop: 0,

                }}

              >

                می‌توانید چند تصویر انتخاب کنید. فرمت مجاز JPG، PNG و WebP و

                حداکثر حجم هر تصویر ۵ مگابایت است. اولین تصویر محصول در صورت

                نداشتن تصویر اصلی، به‌عنوان تصویر اصلی تنظیم می‌شود.

              </p>



              <div

                style={{

                  display: "flex",

                  flexWrap: "wrap",

                  alignItems: "center",

                  gap: "10px",

                  marginBottom: "18px",

                }}

              >

                <input

                  type="file"

                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"

                  multiple

                  onChange={(event) =>

                    setSelectedFiles(Array.from(event.target.files ?? []))

                  }

                  style={{

                    ...fieldStyle,

                    maxWidth: "440px",

                    flex: "1 1 260px",

                  }}

                />



                <button

                  type="button"

                  onClick={() => void handleImageUpload()}

                  disabled={uploadingImages || selectedFiles.length === 0}

                  style={{

                    border: 0,

                    background:

                      uploadingImages || selectedFiles.length === 0

                        ? "#93c5fd"

                        : "#2563eb",

                    color: "#fff",

                    borderRadius: "9px",

                    padding: "12px 18px",

                    cursor:

                      uploadingImages || selectedFiles.length === 0

                        ? "not-allowed"

                        : "pointer",

                    fontFamily: "inherit",

                    fontWeight: 700,

                  }}

                >

                  {uploadingImages

                    ? "در حال آپلود..."

                    : `آپلود تصاویر${selectedFiles.length ? ` (${selectedFiles.length})` : ""}`}

                </button>

              </div>



              {selectedFiles.length > 0 && (

                <p style={{ fontSize: "13px", color: "#374151" }}>

                  فایل‌های انتخاب‌شده:{" "}

                  {selectedFiles.map((file) => file.name).join("، ")}

                </p>

              )}



              {images.length === 0 ? (

                <div

                  style={{

                    padding: "24px",

                    border: "1px dashed #d1d5db",

                    borderRadius: "10px",

                    color: "#6b7280",

                    textAlign: "center",

                    fontSize: "14px",

                  }}

                >

                  هنوز تصویری برای این محصول ثبت نشده است.

                </div>

              ) : (

                <div

                  style={{

                    display: "grid",

                    gridTemplateColumns:

                      "repeat(auto-fill, minmax(190px, 1fr))",

                    gap: "16px",

                  }}

                >

                  {images.map((image) => {

                    const busy = imageBusyId === image.id;



                    return (

                      <div

                        key={image.id}

                        style={{

                          border: image.is_primary

                            ? "2px solid #2563eb"

                            : "1px solid #e5e7eb",

                          borderRadius: "12px",

                          padding: "10px",

                          background: "#fff",

                          minWidth: 0,

                        }}

                      >

                        <div

                          style={{

                            position: "relative",

                            marginBottom: "10px",

                          }}

                        >

                          <img

                            src={imageUrl(image.path)}

                            alt={image.alt || "تصویر محصول"}

                            onError={(event) => {

                              event.currentTarget.style.opacity = "0.2";

                            }}

                            style={{

                              width: "100%",

                              height: "165px",

                              objectFit: "contain",

                              borderRadius: "8px",

                              background: "#f9fafb",

                            }}

                          />



                          {image.is_primary && (

                            <span

                              style={{

                                position: "absolute",

                                top: "8px",

                                right: "8px",

                                background: "#2563eb",

                                color: "#fff",

                                borderRadius: "6px",

                                padding: "5px 8px",

                                fontSize: "11px",

                                fontWeight: 700,

                              }}

                            >

                              تصویر اصلی

                            </span>

                          )}

                        </div>



                        <div

                          style={{

                            display: "grid",

                            gap: "8px",

                          }}

                        >

                          {!image.is_primary && (

                            <button

                              type="button"

                              disabled={busy || imageBusyId !== null}

                              onClick={() => void handleSetPrimary(image)}

                              style={{

                                border: "1px solid #2563eb",

                                background: "#eff6ff",

                                color: "#1d4ed8",

                                padding: "9px",

                                borderRadius: "8px",

                                cursor: busy ? "wait" : "pointer",

                                fontFamily: "inherit",

                                fontSize: "12px",

                                fontWeight: 700,

                              }}

                            >

                              {busy

                                ? "در حال انجام..."

                                : "انتخاب به‌عنوان تصویر اصلی"}

                            </button>

                          )}



                          <button

                            type="button"

                            disabled={busy || imageBusyId !== null}

                            onClick={() => void handleDeleteImage(image)}

                            style={{

                              border: "1px solid #fecaca",

                              background: "#fef2f2",

                              color: "#b91c1c",

                              padding: "9px",

                              borderRadius: "8px",

                              cursor: busy ? "wait" : "pointer",

                              fontFamily: "inherit",

                              fontSize: "12px",

                              fontWeight: 700,

                            }}

                          >

                            {busy ? "در حال انجام..." : "حذف تصویر"}

                          </button>

                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

            </>

          ) : (

            <p

              style={{

                color: "#6b7280",

                fontSize: "13px",

                lineHeight: 1.9,

                marginBottom: 0,

              }}

            >

              برای افزودن تصاویر، ابتدا محصول را ثبت کنید؛ سپس آن را از فهرست

              محصولات باز کنید و وارد صفحه ویرایش شوید.

            </p>

          )}

        </section>



        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "17px" }}>تنوع‌های محصول</h2>
            <button
              type="button"
              onClick={addVariant}
              style={{
                border: "1px solid #587b5b",
                background: "#edf4e9",
                color: "#385e3e",
                borderRadius: 9,
                padding: "9px 14px",
                fontFamily: "inherit",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + افزودن تنوع
            </button>
          </div>

          <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.9, marginTop: 0 }}>
            هر تنوع مانند رنگ، سایز یا بسته‌بندی، موجودی و کد SKU مستقل دارد. اگر قیمت تنوع خالی باشد، قیمت اصلی محصول استفاده می‌شود. تنوع‌های قبلاً فروخته‌شده را حذف نکنید؛ آن‌ها را غیرفعال کنید.
          </p>

          {variants.length === 0 ? (
            <div style={{ border: "1px dashed #d1d5db", borderRadius: 10, padding: 20, color: "#6b7280", textAlign: "center", fontSize: 13 }}>
              هنوز تنوعی برای این محصول تعریف نشده است. در این حالت قیمت و موجودی اصلی محصول استفاده می‌شود.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {variants.map((variant, index) => (
                <div
                  key={variant.id ?? `new-${index}`}
                  style={{
                    border: variant.is_active ? "1px solid #dce4d7" : "1px solid #e5e7eb",
                    background: variant.is_active ? "#fffefa" : "#f9fafb",
                    borderRadius: 12,
                    padding: 15,
                    opacity: variant.is_active ? 1 : 0.72,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 13 }}>
                    <strong style={{ fontSize: 14, color: "#344b3a" }}>تنوع {index + 1}{variant.id ? ` · شناسه ${variant.id}` : " · جدید"}</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                        <input type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(index, "is_active", event.target.checked)} />
                        فعال
                      </label>
                      <button type="button" onClick={() => removeVariant(index)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
                        {variant.id ? "غیرفعال‌سازی" : "حذف"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>نام تنوع *</label>
                      <input value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="مثلاً سایز متوسط" style={fieldStyle} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>سایز (برای فیلتر فروشگاه)</label>
                      <input value={variant.size} maxLength={50} onChange={(event) => updateVariant(index, "size", event.target.value)} placeholder="مثلاً 75B؛ خالی = از نام تنوع" style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>کد SKU تنوع *</label>
                      <input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="مثلاً ITEM-M" style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>قیمت اختصاصی (تومان)</label>
                      <input type="number" min="0" step="1" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="خالی = قیمت محصول" style={fieldStyle} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>قیمت قبل از تخفیف</label>
                      <input type="number" min="0" step="1" value={variant.compare_price} onChange={(event) => updateVariant(index, "compare_price", event.target.value)} placeholder="اختیاری" style={fieldStyle} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>موجودی تنوع *</label>
                      <input type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} style={fieldStyle} disabled={!variant.is_active} />
                    </div>
                    <div>
                      <label style={labelStyle}>مسیر یا URL تصویر تنوع</label>
                      <input value={variant.image} onChange={(event) => updateVariant(index, "image", event.target.value)} placeholder="اختیاری؛ در نبود آن تصویر محصول نمایش داده می‌شود" style={fieldStyle} disabled={!variant.is_active} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>

          <h2 style={{ margin: "0 0 18px", fontSize: "17px" }}>

            قیمت و موجودی

          </h2>



          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",

              gap: "18px",

            }}

          >

            {textField("price", "قیمت (تومان) *", {

              type: "number",

              required: true,

              min: "0",

              step: "1",

            })}

            {textField("compare_price", "قیمت قبل از تخفیف", {

              type: "number",

              min: "0",

              step: "1",

            })}

            {textField("discount_percent", "درصد تخفیف", {

              type: "number",

              min: "0",

              max: "100",

              step: "0.01",

            })}

            {textField("stock", "موجودی انبار", {

              type: "number",

              min: "0",

              step: "1",

              required: true,

            })}

            {textField("weight", "وزن محصول", {

              type: "number",

              min: "0",

              step: "0.01",

              placeholder: "اختیاری",

            })}

          </div>

        </section>



        <section style={sectionStyle}>

          <h2 style={{ margin: "0 0 18px", fontSize: "17px" }}>

            وضعیت و نمایش محصول

          </h2>



          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",

              gap: "12px",

            }}

          >

            {checkboxField("is_active", "محصول فعال باشد")}

            {checkboxField("is_featured", "محصول ویژه باشد")}

            {checkboxField("is_new", "محصول جدید باشد")}

            {checkboxField("is_taxable", "مشمول ارزش افزوده")}

          </div>

        </section>



        <section style={sectionStyle}>

          <AdminProductSizeGuideEditor

            value={sizeGuide}

            onChange={setSizeGuide}

            variantNames={sizeGuideVariantNames}

            onUploadImage={handleSizeGuideImageUpload}

            uploadingImage={sizeGuideUploading}

            uploadError={sizeGuideUploadError}

          />

        </section>



        <section style={sectionStyle}>

          <h2 style={{ margin: "0 0 18px", fontSize: "17px" }}>اطلاعات سئو</h2>



          <div style={{ display: "grid", gap: "18px" }}>

            {textField("meta_title", "عنوان صفحه")}

            {textAreaField(

              "meta_description",

              "توضیحات صفحه برای موتورهای جست‌وجو",

              3,

            )}

          </div>

        </section>



        <div

          style={{

            display: "flex",

            justifyContent: "flex-start",

            gap: "10px",

            flexWrap: "wrap",

            marginBottom: "30px",

          }}

        >

          <button

            type="submit"

            disabled={saving}

            style={{

              border: "1px solid #2563eb",

              background: saving ? "#93c5fd" : "#2563eb",

              color: "#fff",

              padding: "12px 24px",

              borderRadius: "9px",

              cursor: saving ? "wait" : "pointer",

              fontFamily: "inherit",

              fontSize: "14px",

              fontWeight: 700,

            }}

          >

            {saving

              ? "در حال ذخیره..."

              : isEdit

                ? "ذخیره تغییرات"

                : "ثبت محصول"}

          </button>



          <button

            type="button"

            disabled={saving || uploadingImages}

            onClick={() => navigate("/admin/products")}

            style={{

              border: "1px solid #d1d5db",

              background: "#fff",

              color: "#374151",

              padding: "12px 20px",

              borderRadius: "9px",

              cursor: saving || uploadingImages ? "wait" : "pointer",

              fontFamily: "inherit",

              fontSize: "14px",

            }}

          >

            انصراف

          </button>

        </div>

      </form>

    </div>

  );

}



export default AdminProductForm;
