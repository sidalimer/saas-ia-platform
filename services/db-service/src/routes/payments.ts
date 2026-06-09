import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /payments/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

// GET /payments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// POST /payments
router.post('/', async (req, res, next) => {
  try {
    const payment = await prisma.payment.create({ data: req.body });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

// PATCH /payments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

export default router;
