const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const authController = require('../controllers/auth');

router.post('/google', authController.googleSignIn);
router.post('/signup', authController.handleSignUp);
router.post('/login', authController.handleLogIn);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', authController.handleLogOut);

module.exports = router;