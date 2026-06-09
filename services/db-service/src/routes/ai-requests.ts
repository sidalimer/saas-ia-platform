import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /ai-requests/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const requests = await prisma.aiRequest.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await prisma.aiRequest.count({ where: { userId: req.params.userId } });
    res.json({ data: requests, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /ai-requests/:id
router.get('/:id', async (req, res, next) => {
  try {
    const request = await prisma.aiRequest.findUnique({ where: { id: req.params.id } });
    if (!request) { res.status(404).json({ error: 'AI request not found' }); return; }
    res.json(request);
  } catch (err) {
    next(err);
  }
});

// POST /ai-requests
router.post('/', async (req, res, next) => {
  try {
    const request = await prisma.aiRequest.create({ data: req.body });
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// PATCH /ai-requests/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const request = await prisma.aiRequest.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

export default router;
