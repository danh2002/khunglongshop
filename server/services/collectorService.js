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
        },
      });
    }
  }

  const setIds = [
    ...new Set(
      collectorItems
        .map((item) => item.product.setId)
        .filter((setId) => Boolean(setId))
    ),
  ];

  for (const setId of setIds) {
    const alreadyRewarded = await prisma.setReward.findFirst({
      where: {
        userId,
        setId,
      },
    });

    if (alreadyRewarded) continue;

    const isComplete = await checkSetCompletion(userId, setId);
    if (!isComplete) continue;

    const rewardCode = await createUniqueSetRewardCode();
    const reward = await prisma.setReward.create({
      data: {
        userId,
        setId,
        rewardCode,
      },
      include: {
        set: true,
      },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user && user.email) {
      await sendSetCompleteEmail(user.email, reward.set.name, rewardCode);
    }
  }
};

const checkSetCompletion = async (userId, setId) => {
  const collectorSet = await prisma.collectorSet.findUnique({
    where: { id: setId },
  });

  if (!collectorSet) {
    return false;
  }

  const products = await prisma.product.findMany({
    where: {
      setId,
      isCollector: true,
    },
    select: {
      id: true,
      setSlotNumber: true,
    },
  });

  if (products.length !== collectorSet.totalSlots) {
    return false;
  }

  for (const product of products) {
    const code = await prisma.redemptionCode.findFirst({
      where: {
        userId,
        productId: product.id,
        isUsed: false,
      },
    });

    if (!code) {
      return false;
    }
  }

  return true;
};

module.exports = {
  handleOrderCollectorItems,
  checkSetCompletion,
};
