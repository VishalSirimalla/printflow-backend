const Order = require('../models/Order');
const Admin = require('../models/Admin');
const { cloudinary, useCloudinary } = require('../config/cloudinary');
const path = require('path');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Calculate pricing using shop's dynamic pricing config
const calculatePricing = (printSettings, shop, totalPages) => {
  const { color, printSide, paperSize, copies, binding, lamination } = printSettings;
  const p = shop.pricing || {};

  // Base price per page
  let pricePerPage = color === 'color' ? (p.colorPrice || 5) : (p.blackWhitePrice || 1.5);

  // Paper size surcharge
  if (paperSize === 'A3')    pricePerPage += (p.a3Price || 10);
  if (paperSize === 'Legal') pricePerPage += (p.legalPrice || 8);

  // Effective pages (duplex halves sheet count but adds per-page duplex charge)
  const effectivePages = printSide === 'double' ? Math.ceil(totalPages / 2) : totalPages;
  const duplexCharge   = printSide === 'double' ? (p.duplexCharge || 0) * effectivePages : 0;

  // Binding
  let bindingCharge = 0;
  if (binding === 'spiral') bindingCharge = p.spiralBindingCharge || 30;
  if (binding === 'hard')   bindingCharge = p.hardBindingCharge   || 80;

  // Lamination
  let laminationCharge = 0;
  if (lamination === 'single')   laminationCharge = p.singlePageLamination || 15;
  if (lamination === 'document') laminationCharge = p.documentLamination   || 50;

  const subtotal = (pricePerPage * effectivePages * copies) + duplexCharge + bindingCharge + laminationCharge;
  const minimum  = p.minimumOrderCharge || 0;
  const finalSubtotal = Math.max(subtotal, minimum);
  const serviceFee = 0.5;

  return {
    pricePerPage,
    totalPages,
    copies,
    subtotal:   parseFloat(finalSubtotal.toFixed(2)),
    serviceFee,
    grandTotal: parseFloat((finalSubtotal + serviceFee).toFixed(2)),
  };
};

// Upload file and create order
const createOrder = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { shopId, printSettings: settingsStr, totalPages } = req.body;
    const printSettings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : settingsStr;

    const shop = await Admin.findById(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Print shop not found' });

    const pages = parseInt(totalPages) || 1;
    const pricing = calculatePricing(printSettings, shop, pages);
    const otp = generateOTP();

    let fileUrl, publicId, fileName, fileSize;

    if (useCloudinary) {
      fileUrl = req.file.path;
      publicId = req.file.filename;
    } else {
      fileUrl = `/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    fileName = req.file.originalname;
    fileSize = req.file.size;

    const order = await Order.create({
      student: req.user._id,
      shop: shopId,
      file: { fileName, fileUrl, fileSize, totalPages: pages, publicId },
      printSettings,
      pricing,
      otp,
      status: 'waiting_otp',
    });

    await order.populate('shop', 'shopName shopAddress');

    res.status(201).json({ success: true, order, otp });
  } catch (error) {
    next(error);
  }
};

// Get all orders for student
const getStudentOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ student: req.user._id })
      .populate('shop', 'shopName shopAddress rating')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// Get all orders for admin shop
const getAdminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ shop: req.user._id })
      .populate('student', 'fullName college email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// Get single order by ID
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('student', 'fullName college email phone')
      .populate('shop', 'shopName shopAddress rating pricePerPageBW pricePerPageColor');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Authorization check
    const isStudent = req.user.role === 'student' && order.student._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' && order.shop._id.toString() === req.user._id.toString();

    if (!isStudent && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    // Hide file URL from admin until OTP verified
    const orderData = order.toObject();
    if (req.user.role === 'admin' && !order.otpVerified) {
      orderData.file.fileUrl = null;
    }

    res.json({ success: true, order: orderData });
  } catch (error) {
    next(error);
  }
};

// Verify OTP (admin action)
const verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id).populate('student', 'fullName college email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.shop.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (order.otpVerified) {
      return res.json({ success: true, message: 'OTP already verified', order });
    }
    if (order.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    order.otpVerified = true;
    order.otpVerifiedAt = new Date();
    order.status = 'otp_verified';
    await order.save();

    res.json({ success: true, message: 'OTP verified successfully', order });
  } catch (error) {
    next(error);
  }
};

// Update order status (admin)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['printing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.shop.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!order.otpVerified && status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'OTP must be verified first' });
    }

    order.status = status;
    await order.save();
    await order.populate('student', 'fullName college email');

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Get admin dashboard stats
const getAdminStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, pendingOrders, completedOrders, recentOrders] = await Promise.all([
      Order.countDocuments({ shop: req.user._id, createdAt: { $gte: today } }),
      Order.countDocuments({ shop: req.user._id, status: { $in: ['waiting_otp', 'otp_verified', 'printing', 'ready'] } }),
      Order.countDocuments({ shop: req.user._id, status: 'completed' }),
      Order.find({ shop: req.user._id })
        .populate('student', 'fullName college')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({ success: true, stats: { todayOrders, pendingOrders, completedOrders }, recentOrders });
  } catch (error) {
    next(error);
  }
};

// Get available print shops — expose full pricing for student calculation
const getPrintShops = async (req, res, next) => {
  try {
    const shops = await Admin.find().select(
      'shopName shopAddress ownerName phone rating isOpen holidayMode openingTime closingTime pricing'
    );
    res.json({ success: true, shops });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getStudentOrders,
  getAdminOrders,
  getOrderById,
  verifyOTP,
  updateOrderStatus,
  getAdminStats,
  getPrintShops,
};
