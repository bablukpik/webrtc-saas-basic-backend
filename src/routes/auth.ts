import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { ZodError } from 'zod';

const router = Router();

const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

// Generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '15m', // shorter expiry for access token
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d', // longer expiry for refresh token
  });

  return { accessToken, refreshToken };
};

// User Registration
router.post('/register', async (req, res) => {
  const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(['ADMIN', 'USER']).optional(),
  });

  try {
    const { email, password, name, role } = userSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'USER',
        avatar: null,
      },
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login Flow or Token Generation Flow
router.post('/login', async (req, res) => {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        name: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // res.json({ accessToken, refreshToken });

    // Set HTTP-only cookies
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_EXPIRY,
    });

    // Return user data without sensitive information
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token endpoint or Token Refresh Flow
// Verifies refresh token and issues new tokens
// Sets new HTTP-only cookies
router.get('/refresh-token', async (req, res) => {
  //   const { refreshToken } = req.body;
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    // Find user by ID and refresh token
    const user = await prisma.user.findFirst({
      where: {
        AND: [{ id: decoded.userId }, { refreshToken }],
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // res.json(tokens);

    // Set new HTTP-only cookies
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY,
    });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_EXPIRY,
    });

    res.json({ message: 'Tokens refreshed' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout endpoint or Logout Flow
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  // const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }
  try {
    // Clear refresh token in database
    await prisma.user.updateMany({
      where: { refreshToken },
      data: { refreshToken: null },
    });

    // Clear cookies
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error clearing refresh token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
router.get('/me', async (req, res) => {
  try {
    // const accessToken = req.headers.authorization?.split(' ')[1];
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get all users (Admin only)
router.get('/', async (req, res) => {
  // const accessToken = req.headers.authorization?.split(' ')[1];
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    res.json(users);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user role (Admin only)
router.put('/:id/role', async (req, res) => {
  const { role } = req.body;
  // const accessToken = req.headers.authorization?.split(' ')[1];
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const roleSchema = z.object({
    role: z.enum(['ADMIN', 'USER']),
  });

  try {
    roleSchema.parse({ role });

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId: string };
    const adminUser = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (adminUser?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', async (req, res) => {
  // const accessToken = req.headers.authorization?.split(' ')[1];
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

export { router as authRouter };
