"use client";
import AdminOrders from "@/components/AdminOrders";
import DashboardSidebar from "@/components/DashboardSidebar";
import React from "react";

const DashboardOrdersPage = () => {
  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col max-xl:h-fit">
      <DashboardSidebar />
      <AdminOrders />
    </div>
  );
};

export default DashboardOrdersPage;
