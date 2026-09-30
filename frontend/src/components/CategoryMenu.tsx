import { Link } from "react-router-dom";

function CategoryMenu() {
return ( <nav className="bg-white border-b"> <div className="max-w-7xl mx-auto px-6"> <div className="flex gap-8 overflow-x-auto py-4">


      <Link
        to="/products?category=medicine"
        className="whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium transition"
      >
        دارو و محصولات دارویی
      </Link>

      <Link
        to="/products?category=medical-equipment"
        className="whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium transition"
      >
        تجهیزات پزشکی
      </Link>

      <Link
        to="/products?category=personal-care"
        className="whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium transition"
      >
        بهداشت و مراقبت شخصی
      </Link>

      <Link
        to="/products?category=supplements"
        className="whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium transition"
      >
        مکمل‌ها
      </Link>

      <Link
        to="/products?category=mother-child"
        className="whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium transition"
      >
        مادر و کودک
      </Link>

    </div>
  </div>
</nav>


);
}

export default CategoryMenu;
