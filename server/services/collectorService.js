const { randomBytes } = require("crypto");
const prisma = require("../utills/db");

const generateRedemptionCode = () => {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `DKL-${part()}-${part()}-${part()}`;
};

const generateSetRewardCode = () => {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `DKLS-${part()}-${part()}`;
};

const sendSetCompleteEmail = async (userEmail, setName, rewardCode) => {
  const subject = `🦕 Bộ sưu tập ${setName} hoàn chỉnh!`;
  const body = [
    `Chúc mừng! Bạn đã hoàn chỉnh bộ sưu tập ${setName}.`,
    "",
    `Reward code của bạn: ${rewardCode}`,
    "",
    "Hãy mở game Đảo Khủng Long, vào mục nhập mã thưởng, rồi nhập reward code này để nhận phần thưởng.",
  ].join("\n");

  console.log("Set complete email ready", {
    to: userEmail,
    subject,
    body,
  });
};

const createUniqueRedemptionCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRedemptionCode();
    const existing = await prisma.redemptionCode.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique redemption code");
};

const createUniqueSetRewardCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rewardCode = generateSetRewardCode();
    const existing = await prisma.setReward.findUnique({ where: { rewardCode } });

    if (!existing) {
      return rewardCode;
    }
  }

  throw new Error("Unable to generate a unique set reward code");
};

const handleOrderCollectorItems = async (orderId, userId) => {
  const items = await prisma.customer_order_product.findMany({
    where: {
      customerOrderId: orderId,
    },
    include: {
      product: {
        include: {
          set: true,
        },
      },
    },
  });

  const collectorItems = items.filter((item) => item.product.isCollector);

  for (const item of collectorItems) {
    const quantity = Math.max(item.quantity || 1, 1);
    const existingCodes = await prisma.redemptionCode.count({
      where: {
        orderId,
        userId,
        productId: item.productId,
      },
    });
    const missingCodeCount = Math.max(quantity - existingCodes, 0);

    for (let index = 0; index < missingCodeCount; index += 1) {
      await prisma.redemptionCode.create({
        data: {
          code: await createUniqueRedemptionCode(),
          productId: item.productId,
          orderId,
          userId,
          status: "ACTIVE",
          isUsed: false,
        },
      });
    }
  }

  // Purchase creates redemption codes only. Set rewards are granted after
  // the customer redeems enough product codes to unlock every set slot.
};

const checkSetCompletion = async (userId, setId) => {
  const collectorSet = await prisma.collectorSet.findUnique({
    where: { id: setId },
  });

  if (!collectorSet) {
    return false;
  }

  const usedCodes = await prisma.redemptionCode.findMany({
    where: {
      userId,
      status: "REDEEMED",
      product: {
        setId,
        isCollector: true,
      },
    },
    select: {
      product: {
        select: {
          setSlotNumber: true,
        },
      },
    },
  });
  const unlockedSlots = new Set(
    usedCodes
      .map((code) => code.product.setSlotNumber)
      .filter((slot) => slot !== null)
  );

  return unlockedSlots.size >= collectorSet.totalSlots;
};

module.exports = {
  handleOrderCollectorItems,
  checkSetCompletion,
};
