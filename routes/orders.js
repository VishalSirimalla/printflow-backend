const express = require('express');
const router = express.Router();
const { protect, requireStudent, requireAdmin } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createOrder,
  getStudentOrders,
  getAdminOrders,
  getOrderById,
  verifyOTP,
  updateOrderStatus,
  getAdminStats,
  getPrintShops,
} = require('../controllers/orderController');

// Public - get available shops
router.get('/shops', getPrintShops);

// Student routes
router.post('/', protect, requireStudent, upload.single('file'), createOrder);
router.get('/student', protect, requireStudent, getStudentOrders);

// Admin routes
router.get('/admin', protect, requireAdmin, getAdminOrders);
router.get('/admin/stats', protect, requireAdmin, getAdminStats);
router.post('/:id/verify-otp', protect, requireAdmin, verifyOTP);
router.patch('/:id/status', protect, requireAdmin, updateOrderStatus);

// Shared - single order (both student and admin)
router.get('/:id', protect, getOrderById);

module.exports = router;
