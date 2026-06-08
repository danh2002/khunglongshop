const express = require("express");

const router = express.Router();
const { requireAdminSession } = require("../middleware/adminAuth");
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
} = require("../controllers/products");

router.route("/").get(getAllProducts).post(requireAdminSession, createProduct);


router
  .route("/:id")
  .get(getProductById)
  .put(requireAdminSession, updateProduct)
  .delete(requireAdminSession, deleteProduct);

module.exports = router;
