const express = require('express');

const router = express.Router();
const { requireAdminSession } = require('../middleware/adminAuth');

const {
    getCustomerOrder,
    createCustomerOrder,
    updateCustomerOrder,
    deleteCustomerOrder,
    getAllOrders 
  } = require('../controllers/customer_orders');

  router.route('/')
  .get(getAllOrders)
  .post(createCustomerOrder);

  router.route('/:id')
  .get(getCustomerOrder)
  .put(requireAdminSession, updateCustomerOrder)
  .delete(requireAdminSession, deleteCustomerOrder);


  module.exports = router;
