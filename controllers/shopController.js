const Admin = require('../models/Admin');

// GET /api/shop/profile  — own shop info
const getShopProfile = async (req, res, next) => {
  try {
    res.json({ success: true, shop: req.user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/shop/profile  — update non-pricing fields
const updateShopProfile = async (req, res, next) => {
  try {
    const allowed = ['shopName', 'ownerName', 'phone', 'shopAddress'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const shop = await Admin.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, shop });
  } catch (err) {
    next(err);
  }
};

// PUT /api/shop/pricing  — update all pricing + availability
const updateShopPricing = async (req, res, next) => {
  try {
    const {
      pricing,
      isOpen, holidayMode,
      openingTime, closingTime,
    } = req.body;

    const update = {};
    if (pricing)       update.pricing     = pricing;
    if (isOpen !== undefined)      update.isOpen      = isOpen;
    if (holidayMode !== undefined) update.holidayMode = holidayMode;
    if (openingTime)   update.openingTime = openingTime;
    if (closingTime)   update.closingTime = closingTime;

    const shop = await Admin.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, shop });
  } catch (err) {
    next(err);
  }
};

// GET /api/shop/pricing/:shopId  — public: student fetches shop pricing
const getShopPricing = async (req, res, next) => {
  try {
    const shop = await Admin.findById(req.params.shopId).select(
      'shopName shopAddress rating isOpen holidayMode openingTime closingTime pricing'
    );
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    res.json({ success: true, shop });
  } catch (err) {
    next(err);
  }
};

module.exports = { getShopProfile, updateShopProfile, updateShopPricing, getShopPricing };
