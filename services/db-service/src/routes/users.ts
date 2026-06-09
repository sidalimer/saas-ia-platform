import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /users
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
        subscription: { include: { plan: true } },
      },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /users/email/:email
router.get('/email/:email', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /users/verify-token/:token
router.get('/verify-token/:token', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: req.params.token },
    });
    if (!user) { res.status(404).json({ error: 'Invalid token' }); return; }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /users/reset-token/:token
router.get('/reset-token/:token', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: req.params.token },
    });
    if (!user) { res.status(404).json({ error: 'Invalid token' }); return; }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /users
router.post('/', async (req, res, next) => {
  try {
    const user = await prisma.user.create({
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        totpEnabled: true,
        updatedAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
