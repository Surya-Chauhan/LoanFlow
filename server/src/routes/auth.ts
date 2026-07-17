import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const generateToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(
    { userId, email, role },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string } as jwt.SignOptions
  );
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }),
    body('email').isEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
      return;
    }
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const exists = await User.findOne({ email: normalizedEmail });
      if (exists) {
        res.status(409).json({ success: false, message: 'Email already registered.' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'borrower' });
      const token = generateToken(user._id.toString(), user.email, user.role);
      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          token,
          user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isProfileComplete: user.isProfileComplete,
            breStatus: user.breStatus,
          },
        },
      });
    } catch (err: unknown) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
      return;
    }
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Use a generic message to avoid user enumeration
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      const token = generateToken(user._id.toString(), user.email, user.role);
      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isProfileComplete: user.isProfileComplete,
            breStatus: user.breStatus,
          },
        },
      });
    } catch (err: unknown) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isProfileComplete: user.isProfileComplete,
          breStatus: user.breStatus,
        },
      },
    });
  } catch (err: unknown) {
    console.error('Auth/me error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

export default router;
