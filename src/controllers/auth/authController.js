/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile endpoints
 */

const User = require('../../models/auth/User');
const FCM = require('../../models/auth/FCM');
const { generateToken } = require('../../utils/jwt');
const jwtConfig = require('../../config/jwt');
const { asyncHandler } = require('../../middleware');
const { ValidationError, AuthenticationError } = require('../../utils/errors');
const Company = require('../../models/auth/Company');
const Department = require('../../models/auth/Department');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    const details = {};
    if (!username) details.username = 'Username is required';
    if (!email) details.email = 'Email is required';
    if (!password) details.password = 'Password is required';

    throw new ValidationError(
      'Username, email, and password are required',
      details
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existingUser) {
    const field =
      existingUser.email === email.toLowerCase() ? 'email' : 'username';
    const details = {};
    details[field] = `This ${field} is already registered`;
    throw new ValidationError(
      `User with this ${field} already exists`,
      details
    );
  }

  // Create new user
  const userData = {
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role || 'user', // Default to 'user' role
  };

  const user = new User(userData);
  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  // Set JWT token in HTTP-only cookie
  const cookieOptions = jwtConfig.getCookieOptions();
  const cookieName = jwtConfig.getTokenCookieName();

  res.cookie(cookieName, token, cookieOptions);

  // Return success response with user data (excluding password)
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toSafeObject(),
      token, // Include token in response for client-side reference
    },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  // Validate required fields
  if (!identifier || !password) {
    const details = {};
    if (!identifier) details.identifier = 'Email or username is required';
    if (!password) details.password = 'Password is required';

    throw new ValidationError(
      'Email/username and password are required',
      details
    );
  }

  // Find user by email or username
  const user = await User.findByCredentials(identifier);

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Check if user is active
  if (user.deactivated) {
    throw new AuthenticationError(
      'Account is deactivated. Please contact support.'
    );
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid credentials');
  }

  const { fcmToken } = req.body;

  if (fcmToken) {
    const noti = await FCM.findOne({ user: user._id });
    if (noti) {
      if (!noti.tokens) {
        noti.tokens = [];
      }
      if (!noti.tokens.includes(fcmToken)) {
        noti.tokens.push(fcmToken);
        await noti.save();
      }
    } else {
      const newAgent = new FCM({
        user: user._id,
        tokens: [fcmToken],
      });
      await newAgent.save();
    }
  }

  // Generate JWT token
  const token = generateToken(user);

  // Set JWT token in HTTP-only cookie
  const cookieOptions = jwtConfig.getCookieOptions();
  const cookieName = jwtConfig.getTokenCookieName();

  user.lastLogin = Date.now();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save({ validateBeforeSave: false });

  res.cookie(cookieName, token, cookieOptions);

  // Return success response with user data
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      token,
      fcmToken,
    },
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { fcmtoken } = req.body;

  if (fcmtoken) {
    const agent = await FCM.findOne({
      user: req.body.userId,
    });

    if (agent && agent.tokens) {
      agent.tokens = agent.tokens.filter((token) => token !== fcmtoken);
      await agent.save();
    }
  }

  // Clear JWT cookie
  const cookieName = jwtConfig.getTokenCookieName();
  const clearCookieOptions = jwtConfig.getClearCookieOptions();

  res.clearCookie(cookieName, clearCookieOptions);

  // Return success response
  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * Get current user information
 * GET /api/auth/me
 * Requires authentication middleware
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // User is already available from authentication middleware
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (Number(req.user.tokenVersion) !== Number(req.tokenVersion)) {
    throw new AuthenticationError('Invalid token');
  }

  const company = await Company.findById(req.company);

  const currentDate = new Date();
  const subscriptionEndDate = new Date(company.subscriptionEndDate);
  const isSubscriptionActive = currentDate <= subscriptionEndDate;

  if (!isSubscriptionActive && company.subscriptionPlan !== 'free') {
    if (req.role === 'superadmin') {
      throw new AuthenticationError('Update Subscription');
    } else {
      throw new AuthenticationError('Subscription expired');
    }
  }

  const department = await Department.findById(req?.user?.department);

  if (req.body.fcmtoken) {
    const fcm = await FCM.findOne({ user: req.id });
    if (fcm) {
      fcm.tokens.push(req.body.fcmtoken);
      await fcm.save();
    } else {
      const newFCM = new FCM({
        user: req.id,
        tokens: [req.body.fcmtoken],
      });
      await newFCM.save();
    }
  }

  const activatedUnits = company.units.filter((unit) => unit.activated);

  // Return current user data
  res.status(200).json({
    success: true,
    message: 'User information retrieved successfully',
    data: {
      ...req.user.toObject(),
      app: company?.app,
      units: activatedUnits,
      dashboard: department?.dashboard || 'main',
      subscriptionPlan: company.subscriptionPlan,
    },
  });
});

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};
