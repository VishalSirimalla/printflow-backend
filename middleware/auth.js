const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user based on role stored in token
    if (decoded.role === 'student') {
      req.user = await Student.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id);
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const requireStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') return next();
  res.status(403).json({ success: false, message: 'Access denied: Students only' });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Access denied: Admins only' });
};

module.exports = { protect, requireStudent, requireAdmin };
