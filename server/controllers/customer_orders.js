const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { validateOrderData, ValidationError } = require('../utills/validation');
const { createOrderUpdateNotification } = require('../utills/notificationHelpers');
const { handleOrderCollectorItems } = require('../services/collectorService');

const isCollectorPaymentSuccessStatus = (status) =>
  ['paid', 'completed'].includes(String(status || '').toLowerCase());

async function resolveOrderUserId(userId, email) {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, email: true },
  });

  if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
    throw new ValidationError('Authenticated user does not match order email', 'userId');
  }

  return user.id;
}

// TODO(manual-review): Split this oversized handler into validation, persistence, and notification orchestration.
async function createCustomerOrder(request, response) {
  try {
    // Validate request body
    if (!request.body || typeof request.body !== 'object') {
      return response.status(400).json({ 
        error: "Invalid request body",
        details: "Request body must be a valid JSON object"
      });
    }

    // Server-side validation
    const validation = validateOrderData(request.body);
    if (!validation.isValid) {
      return response.status(400).json({
        error: "Validation failed",
        details: validation.errors
      });
    }

    const validatedData = validation.validatedData;

    let orderUserId = null;
    try {
      orderUserId = await resolveOrderUserId(request.body.userId, validatedData.email);
    } catch (ownershipError) {
      if (ownershipError instanceof ValidationError) {
        return response.status(403).json({
          error: "Order ownership validation failed",
          details: [{ field: ownershipError.field, message: ownershipError.message }]
        });
      }
      throw ownershipError;
    }

    // Additional business logic validation
    if (validatedData.total <= 0) {
      return response.status(400).json({
        error: "Tổng giá trị đơn hàng không hợp lệ",
        details: [{ field: 'total', message: 'Tổng giá trị đơn hàng phải lớn hơn 0đ' }]
      });
    }

    // Check for duplicate orders (same email and total within last 1 minute) - less strict
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const duplicateOrder = await prisma.customer_order.findFirst({
      where: {
        email: validatedData.email,
        total: validatedData.total,
        dateTime: {
          gte: oneMinuteAgo
        }
      }
    });

    if (duplicateOrder) {
      return response.status(409).json({
        error: "Đơn hàng bị trùng",
        details: "Một đơn hàng giống hệt vừa được tạo. Vui lòng chờ trước khi đặt lại."
      });
    }

    // Create the order with validated data
    const corder = await prisma.customer_order.create({
      data: {
        name: validatedData.name,
        lastname: validatedData.lastname,
        phone: validatedData.phone,
        email: validatedData.email,
        company: validatedData.company,
        adress: validatedData.adress,
        apartment: validatedData.apartment,
        postalCode: validatedData.postalCode,
        status: validatedData.status,
        city: validatedData.city,
        country: validatedData.country,
        orderNotice: validatedData.orderNotice,
        total: validatedData.total,
        userId: orderUserId,
        dateTime: new Date()
      },
    });

    // Create notification for the user if they have an account
    try {
      let user = null;
      
      // First, try to use userId if provided (from logged-in user)
      if (request.body.userId) {
        user = await prisma.user.findUnique({
          where: { id: request.body.userId }
        });
      }
      
      // Fallback: search by email if no userId or user not found
      if (!user) {
        user = await prisma.user.findUnique({
          where: { email: validatedData.email }
        });
      }
      
      if (user) {
        await createOrderUpdateNotification(
          user.id,
          'confirmed',
          corder.id,
          validatedData.total
        );
      }
    } catch (notificationError) {
      console.error('❌ Failed to create order notification:', notificationError);
      // Don't fail the order if notification fails
    }

    const responseData = {
      id: corder.id,
      message: "Order created successfully",
      orderNumber: corder.id
    };
    
    return response.status(201).json(responseData);

  } catch (error) {
    console.error("❌ Error creating order:", error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return response.status(409).json({ 
        error: "Order conflict",
        details: "An order with this information already exists"
      });
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      return response.status(400).json({
        error: "Validation failed",
        details: [{ field: error.field, message: error.message }]
      });
    }

    // Generic error response
    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to create order. Please try again later."
    });
  }
}

// TODO(manual-review): Split this oversized handler into validation, persistence, notification, and collector processing.
async function updateCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return response.status(400).json({
        error: "Invalid order ID",
        details: "Order ID must be provided"
      });
    }

    // Validate request body
    if (!request.body || typeof request.body !== 'object') {
      return response.status(400).json({ 
        error: "Invalid request body",
        details: "Request body must be a valid JSON object"
      });
    }

    // Server-side validation for update data
    const validation = validateOrderData(request.body);
    
    if (!validation.isValid) {
      return response.status(400).json({
        error: "Validation failed",
        details: validation.errors
      });
    }

    const validatedData = validation.validatedData;

    const existingOrder = await prisma.customer_order.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingOrder) {
      return response.status(404).json({ 
        error: "Order not found",
        details: "The specified order does not exist"
      });
    }

    const updatedOrder = await prisma.customer_order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        name: validatedData.name,
        lastname: validatedData.lastname,
        phone: validatedData.phone,
        email: validatedData.email,
        company: validatedData.company,
        adress: validatedData.adress,
        apartment: validatedData.apartment,
        postalCode: validatedData.postalCode,
        status: validatedData.status,
        city: validatedData.city,
        country: validatedData.country,
        orderNotice: validatedData.orderNotice,
        total: validatedData.total,
      },
    });

    // Create notification for status update if status changed
    if (existingOrder.status !== validatedData.status) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: validatedData.email }
        });
        
        if (user) {
          await createOrderUpdateNotification(
            user.id,
            validatedData.status,
            updatedOrder.id,
            validatedData.total
          );
        }
      } catch (notificationError) {
        console.error('❌ Failed to create status update notification:', notificationError);
      }
    }

    if (
      existingOrder.status !== validatedData.status &&
      isCollectorPaymentSuccessStatus(validatedData.status)
    ) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: validatedData.email }
        });

        if (user) {
          await handleOrderCollectorItems(updatedOrder.id, user.id);
        }
      } catch (collectorError) {
        console.error('Failed to process collector items:', collectorError);
      }
    }
    if (existingOrder.userId !== request.user.id) {
      return response.status(403).json({ error: "FORBIDDEN" });
    }

    return response.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    
    if (error.code === 'P2025') {
      return response.status(404).json({ 
        error: "Order not found",
        details: "The specified order does not exist"
      });
    }

    if (error instanceof ValidationError) {
      return response.status(400).json({
        error: "Validation failed",
        details: [{ field: error.field, message: error.message }]
      });
    }

    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to update order. Please try again later."
    });
  }
}

// TODO(manual-review): Split this oversized handler into validation, authorization, and deletion orchestration.
async function deleteCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    
    if (!id || typeof id !== 'string') {
      return response.status(400).json({
        error: "Invalid order ID",
        details: "Order ID must be provided"
      });
    }

    const existingOrder = await prisma.customer_order.findUnique({
      where: { id: id },
    });

    if (!existingOrder) {
      return response.status(404).json({ 
        error: "Order not found",
        details: "The specified order does not exist"
      });
    }
    if (existingOrder.userId !== request.user.id) {
      return response.status(403).json({ error: "FORBIDDEN" });
    }

    await prisma.customer_order.delete({
      where: {
        id: id,
      },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting order:", error);
    
    if (error.code === 'P2025') {
      return response.status(404).json({ 
        error: "Order not found",
        details: "The specified order does not exist"
      });
    }

    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to delete order. Please try again later."
    });
  }
}

async function getCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    
    if (!id || typeof id !== 'string') {
      return response.status(400).json({
        error: "Invalid order ID",
        details: "Order ID must be provided"
      });
    }

    const order = await prisma.customer_order.findUnique({
      where: {
        id: id,
      },
    });
    
    if (!order) {
      return response.status(404).json({ 
        error: "Order not found",
        details: "The specified order does not exist"
      });
    }
    if (order.userId !== request.user.id) {
      return response.status(403).json({ error: "FORBIDDEN" });
    }
    
    return response.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to fetch order. Please try again later."
    });
  }
}

// TODO(manual-review): Split this oversized handler into pagination validation, querying, and response formatting.
async function getAllOrders(request, response) {
  try {
    // Add pagination and filtering for better performance
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return response.status(400).json({
        error: "Invalid pagination parameters",
        details: "Page must be >= 1, limit must be between 1 and 100"
      });
    }

    const [orders, totalCount] = await Promise.all([
      prisma.customer_order.findMany({
        where: { userId: request.user.id },
        skip: offset,
        take: limit,
        orderBy: {
          dateTime: 'desc'
        }
      }),
      prisma.customer_order.count({ where: { userId: request.user.id } })
    ]);

    return response.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to fetch orders. Please try again later."
    });
  }
}

module.exports = {
  createCustomerOrder,
  updateCustomerOrder,
  deleteCustomerOrder,
  getCustomerOrder,
  getAllOrders,
};
