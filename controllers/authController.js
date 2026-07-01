const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const { sendPasswordResetEmail } = require('../services/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// ── Student Registration ─────────────────────────────────────────────────────
const registerStudent = async (req, res, next) => {
  try {
    const { fullName, college, email, phone, password } = req.body;
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const student = await Student.create({ fullName, college, email, phone, password });
    const token = generateToken(student._id, 'student');
    res.status(201).json({ success: true, token, user: student, role: 'student' });
  } catch (error) { next(error); }
};

// ── Student Login ────────────────────────────────────────────────────────────
const loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email }).select('+password');
    if (!student) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const isMatch = await student.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const token = generateToken(student._id, 'student');
    res.json({ success: true, token, user: student, role: 'student' });
  } catch (error) { next(error); }
};

// ── Google Student Login ─────────────────────────────────────────────────────
const googleLoginStudent = async (req, res, next) => {
  try {
    const { credential, clientId } = req.body;

    if (!credential || !clientId) {
      return res.status(400).json({ success: false, message: 'Google login credentials are missing' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    const email = payload.email.toLowerCase();
    let student = await Student.findOne({ email });

    if (!student) {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      student = await Student.create({
        fullName: payload.name || payload.given_name || 'Google User',
        college: 'Google Sign-In',
        email,
        phone: '0000000000',
        password: randomPassword,
      });
    }

    const token = generateToken(student._id, 'student');
    res.json({ success: true, token, user: student, role: 'student' });
  } catch (error) {
    next(error);
  }
};

// ── Google Admin Login ───────────────────────────────────────────────────────
const googleLoginAdmin = async (req, res, next) => {
  try {
    const { credential, clientId } = req.body;

    if (!credential || !clientId) {
      return res.status(400).json({ success: false, message: 'Google login credentials are missing' });
    }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    const email = payload.email.toLowerCase();
    let admin = await Admin.findOne({ email });

    if (!admin) {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      admin = await Admin.create({
        shopName: payload.name || 'Google Sign-In Shop',
        ownerName: payload.name || 'Google Admin',
        email,
        phone: '0000000000',
        password: randomPassword,
        shopAddress: 'Google Sign-In',
      });
    }

    const token = generateToken(admin._id, 'admin');
    res.json({ success: true, token, user: admin, role: 'admin' });
  } catch (error) {
    next(error);
  }
};

// ── Admin Registration ───────────────────────────────────────────────────────
const registerAdmin = async (req, res, next) => {
  try {
    const { shopName, ownerName, email, phone, password, shopAddress } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const admin = await Admin.create({ shopName, ownerName, email, phone, password, shopAddress });
    const token = generateToken(admin._id, 'admin');
    res.status(201).json({ success: true, token, user: admin, role: 'admin' });
  } catch (error) { next(error); }
};

// ── Admin Login ──────────────────────────────────────────────────────────────
const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const token = generateToken(admin._id, 'admin');
    res.json({ success: true, token, user: admin, role: 'admin' });
  } catch (error) { next(error); }
};

// ── Get Me ───────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user, role: req.user.role });
};

// ── Forgot Password ──────────────────────────────────────────────────────────
// Works for both students and admins. Always returns the same generic message
// to avoid revealing whether an email is registered.
const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body; // role: 'student' | 'admin'

    const Model = role === 'admin' ? Admin : Student;
    const user  = await Model.findOne({ email });

    // Always respond with the same message regardless of whether email exists
    const GENERIC = 'If that email is registered, a reset link has been sent.';

    if (!user) return res.json({ success: true, message: GENERIC });

    // Generate raw token, store hashed version + expiry
    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}?role=${role}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    }catch (emailErr) {
  console.error("EMAIL ERROR:", emailErr);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save({ validateBeforeSave: false });

  return next(new Error('Email could not be sent. Please try again.'));
}

    res.json({ success: true, message: GENERIC });
  } catch (error) { next(error); }
};

// ── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, role } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Hash the incoming raw token to compare with the stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const Model = role === 'admin' ? Admin : Student;

    const user = await Model.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // token must not be expired
    }).select('+resetPasswordToken +resetPasswordExpire +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    // Set new password — pre-save hook will hash it
    user.password            = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) { next(error); }
};

module.exports = {
  registerStudent, loginStudent, googleLoginStudent,
  registerAdmin,   loginAdmin, googleLoginAdmin,
  getMe,
  forgotPassword,  resetPassword,
};
