const express = require("express");

const router = express.Router();
const { requireAdminSession } = require("../middleware/adminAuth");

const {
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../controllers/category");

router.route("/").get(getAllCategories).post(requireAdminSession, createCategory);

router
  .route("/:id")
  .get(getCategory)
  .put(requireAdminSession, updateCategory)
  .delete(requireAdminSession, deleteCategory);

module.exports = router;
