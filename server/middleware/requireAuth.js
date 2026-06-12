let getToken;

try {
  ({ getToken } = require("../../node_modules/next-auth/jwt"));
} catch (error) {
  ({ getToken } = require("next-auth/jwt"));
}

module.exports = async function requireAuth(req, res, next) {
  try {
    if (req.user?.id || req.session?.userId) {
      req.user = req.user || { id: req.session.userId };
      return next();
    }

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.id) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    req.user = {
      id: String(token.id),
      email: token.email ? String(token.email) : null,
      role: token.role ? String(token.role) : "user",
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
};
