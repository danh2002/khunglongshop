let getToken;

try {
  ({ getToken } = require("../../node_modules/next-auth/jwt"));
} catch (error) {
  ({ getToken } = require("next-auth/jwt"));
}

async function requireAdminSession(request, response, next) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return response.status(401).json({
        error: "Unauthorized",
      });
    }

    if (token.role !== "admin") {
      return response.status(403).json({
        error: "Forbidden",
      });
    }

    request.admin = {
      id: token.id,
      email: token.email,
      role: token.role,
    };

    return next();
  } catch (error) {
    return response.status(401).json({
      error: "Unauthorized",
    });
  }
}

module.exports = {
  requireAdminSession,
};
