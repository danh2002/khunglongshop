const express = require("express");

const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  getAllWishlistByUserId,
  getAllWishlist,
  createWishItem,
  deleteWishItem,
  getSingleProductFromWishlist
} = require("../controllers/wishlist");

router.use(requireAuth);

router.route("/").get(getAllWishlist).post(createWishItem);
router.route("/:userId").get(getAllWishlistByUserId);
router.route("/:userId/:productId").get(getSingleProductFromWishlist).delete(deleteWishItem);

module.exports = router;
