const express = require('express');

const router = express.Router();
const { requireAdminSession } = require('../middleware/adminAuth');

const {
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers, 
    getUserByEmail
  } = require('../controllers/users');

  router.route('/')
  .get(getAllUsers)
  .post(requireAdminSession, createUser);

  router.route('/:id')
  .get(getUser)
  .put(requireAdminSession, updateUser)
  .delete(requireAdminSession, deleteUser);

  router.route('/email/:email')
  .get(getUserByEmail);


  module.exports = router;
