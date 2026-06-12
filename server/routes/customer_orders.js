const express = require('express');

const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

const {
    getCustomerOrder,
    updateCustomerOrder,
    deleteCustomerOrder,
    getAllOrders 
  } = require('../controllers/customer_orders');

  router.use(requireAuth);

  router.route('/')
  .get(getAllOrders)
  .post((_req, res) => res.status(410).json({
    error: 'STOREFRONT_CHECKOUT_MOVED',
    message: 'Use the authenticated Next.js POST /api/orders endpoint.'
  }));

  router.route('/:id')
  .get(getCustomerOrder)
  .put(updateCustomerOrder)
  .delete(deleteCustomerOrder);


  module.exports = router;
