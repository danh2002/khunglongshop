const express = require("express");
const router = express.Router();
const { requireAdminSession } = require("../middleware/adminAuth");
const {
  getAllMerchants,
  getMerchantById,
  createMerchant,
  updateMerchant,
  deleteMerchant,
} = require("../controllers/merchant");

// Get all merchants
router.get("/", getAllMerchants);

// Get a specific merchant by ID
router.get("/:id", getMerchantById);

// Create a new merchant
router.post("/", requireAdminSession, createMerchant);

// Update a merchant
router.put("/:id", requireAdminSession, updateMerchant);

// Delete a merchant
router.delete("/:id", requireAdminSession, deleteMerchant);

module.exports = router;
