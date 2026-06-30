const express = require('express');
const router = express.Router();
const {
  registerStudent, loginStudent, googleLoginStudent,
  registerAdmin,   loginAdmin, googleLoginAdmin,
  getMe,
  forgotPassword,  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/student/register', registerStudent);
router.post('/student/login',    loginStudent);
router.post('/student/google',    googleLoginStudent);
router.post('/admin/register',   registerAdmin);
router.post('/admin/login',      loginAdmin);
router.post('/admin/google',      googleLoginAdmin);
router.get('/me',                protect, getMe);

router.post('/forgot-password',          forgotPassword);
router.post('/reset-password/:token',    resetPassword);

module.exports = router;
