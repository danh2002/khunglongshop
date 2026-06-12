const express = require('express');

const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

const {
     updateProductOrder,
      deleteProductOrder,
       getProductOrder,
       getAllProductOrders
  } = require('../controllers/customer_order_product');

  router.use(requireAuth);

  router.route('/')
  .get(getAllProductOrders)
  .post((_req, res) => res.status(410).json({
    error: 'ORDER_ITEM_MUTATION_DISABLED',
    message: 'Order items are created atomically by POST /api/orders.'
  }));

  router.route('/:id')
  .get(getProductOrder)
  .put(updateProductOrder) 
  .delete(deleteProductOrder); 


  module.exports = router;
