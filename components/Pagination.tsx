"use client";

import { usePaginationStore } from "@/app/_zustand/paginationStore";

const Pagination = () => {
  const { page, incrementPage, decrementPage } = usePaginationStore();

  return (
    <div className="join flex justify-center py-16">
      <button
        aria-label="Trang trước"
        className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500"
        onClick={() => decrementPage()}
      >
        {"\u00AB"}
      </button>
      <button className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500">
        Trang {page}
      </button>
      <button
        aria-label="Trang sau"
        className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500"
        onClick={() => incrementPage()}
      >
        {"\u00BB"}
      </button>
    </div>
  );
};

export default Pagination;
