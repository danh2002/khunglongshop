import { DashboardSidebar, StatsElement } from "@/components";
import prisma from "@/utils/db";
import React from "react";
import { FaArrowUp } from "react-icons/fa6";

const CollectorStatsCard = ({ title, value }: { title: string; value: number }) => {
  return (
    <div className="w-80 h-32 bg-blue-500 text-white flex flex-col justify-center items-center rounded-md max-md:w-full">
      <h4 className="text-xl text-white text-center">{title}</h4>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-green-300 flex gap-x-1 items-center">
        <FaArrowUp />
        Collector system
      </p>
    </div>
  );
};

const AdminDashboardPage = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthlyCodes, completedSets, claimedRewards] = await Promise.all([
    prisma.redemptionCode.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.setReward.count(),
    prisma.setReward.count({
      where: {
        isClaimed: true,
      },
    }),
  ]);

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto max-xl:flex-col">
      <DashboardSidebar />
      <div className="flex flex-col items-center ml-5 gap-y-4 w-full max-xl:ml-0 max-xl:px-2 max-xl:mt-5 max-md:gap-y-1">
        <div className="flex justify-between w-full max-md:flex-col max-md:w-full max-md:gap-y-1">
          <StatsElement />
          <StatsElement />
          <StatsElement />
        </div>
        <div className="flex justify-between w-full gap-4 max-md:flex-col max-md:w-full max-md:gap-y-1">
          <CollectorStatsCard title="Mã phát tháng này" value={monthlyCodes} />
          <CollectorStatsCard title="Bộ sưu tập hoàn chỉnh" value={completedSets} />
          <CollectorStatsCard title="Đã đổi vào game" value={claimedRewards} />
        </div>
        <div className="w-full bg-blue-500 text-white h-40 flex flex-col justify-center items-center gap-y-2">
          <h4 className="text-3xl text-gray-100 max-[400px]:text-2xl">
            Number of visitors today
          </h4>
          <p className="text-3xl font-bold">1200</p>
          <p className="text-green-300 flex gap-x-1 items-center">
            <FaArrowUp />
            12.5% Since last month
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
