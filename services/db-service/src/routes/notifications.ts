import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /notifications/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// POST /notifications
router.post('/', async (req, res, next) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

export default router;
