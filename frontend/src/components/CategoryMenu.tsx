import { Link } from "react-router-dom";

function CategoryMenu() {
  const categories = [
    { to: "/products?category=medicine", label: "دارو و محصولات دارویی" },
    { to: "/products?category=medical-equipment", label: "تجهیزات پزشکی" },
    { to: "/products?category=personal-care", label: "بهداشت و مراقبت شخصی" },
    { to: "/products?category=supplements", label: "مکمل‌ها" },
    { to: "/products?category=mother-child", label: "مادر و کودک" },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto py-3 sm:py-4 whitespace-nowrap">
          {categories.map((category) => (
            <Link
              key={category.to}
              to={category.to}
              className="shrink-0 text-sm sm:text-base text-gray-700 hover:text-blue-600 font-medium transition"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default CategoryMenu;
