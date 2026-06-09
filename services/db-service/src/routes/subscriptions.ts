import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /subscriptions
router.get('/', async (_req, res, next) => {
  try {
    const subs = await prisma.subscription.findMany({ include: { plan: true, user: { select: { id: true, email: true } } } });
    res.json(subs);
  } catch (err) {
    next(err);
  }
});

// GET /subscriptions/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.params.userId },
      include: { plan: true },
    });
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /subscriptions
router.post('/', async (req, res, next) => {
  try {
    const sub = await prisma.subscription.create({
      data: req.body,
      include: { plan: true },
    });
    res.status(201).json(sub);
  } catch (err) {
    next(err);
  }
});

// PATCH /subscriptions/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const sub = await prisma.subscription.update({
      where: { id: req.params.id },
      data: req.body,
      include: { plan: true },
    });
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

// POST /subscriptions/:id/increment-usage
router.post('/:id/increment-usage', async (req, res, next) => {
  try {
    const sub = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { aiRequestsUsed: { increment: 1 } },
      include: { plan: true },
    });
    res.json({ aiRequestsUsed: sub.aiRequestsUsed, limit: sub.plan.aiRequestsLimit });
  } catch (err) {
    next(err);
  }
});

// DELETE /subscriptions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.subscription.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
