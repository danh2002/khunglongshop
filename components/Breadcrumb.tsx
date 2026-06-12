"use client";

// *********************
// Role of the component: Component that displays current page location in the application 
// Name of the component: Breadcrumb.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <Breadcrumb />
// Input parameters: No input parameters
// Output: Page location in the application
// *********************

import Link from "next/link";
import { FaHouse } from "react-icons/fa6";

const Breadcrumb = () => {
  return (
    <div className="text-lg breadcrumbs pb-10 py-5 max-sm:text-base">
      <ul>
        <li>
          <Link href="/">
            <FaHouse className="mr-2" />
            Trang chủ
          </Link>
        </li>
        <li>
          <Link href="/shop">Bộ sưu tập</Link>
        </li>
        <li>
          <Link href="/shop">Tất cả sản phẩm</Link>
        </li>
      </ul>
    </div>
  );
};

export default Breadcrumb;
