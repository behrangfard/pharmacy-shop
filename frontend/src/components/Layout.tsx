import type { ReactNode } from "react";

import Header from "./Header";
import Footer from "./Footer";
import CategoryMenu from "./CategoryMenu";

interface LayoutProps {
children: ReactNode;
}

function Layout({ children }: LayoutProps) {
return ( <div className="min-h-screen bg-slate-50"> <Header />


  <CategoryMenu />

  <main>
    {children}
  </main>

  <Footer />
</div>


);
}

export default Layout;
