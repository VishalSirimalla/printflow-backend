const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const { getShopProfile, updateShopProfile, updateShopPricing, getShopPricing } = require('../controllers/shopController');

// Public
router.get('/pricing/:shopId', getShopPricing);

// Admin-protected
router.get('/profile',       protect, requireAdmin, getShopProfile);
router.put('/profile',       protect, requireAdmin, updateShopProfile);
router.put('/pricing',       protect, requireAdmin, updateShopPricing);

module.exports = router;
