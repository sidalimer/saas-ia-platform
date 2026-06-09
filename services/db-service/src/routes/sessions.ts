import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /sessions/user/:userId
router.get('/user/:userId', async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// GET /sessions/token/:refreshToken
router.get('/token/:refreshToken', async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { refreshToken: req.params.refreshToken },
      include: { user: true },
    });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /sessions
router.post('/', async (req, res, next) => {
  try {
    const session = await prisma.session.create({ data: req.body });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// DELETE /sessions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.session.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /sessions/user/:userId (logout all)
router.delete('/user/:userId', async (req, res, next) => {
  try {
    await prisma.session.deleteMany({ where: { userId: req.params.userId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
