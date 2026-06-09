import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /plans
router.get('/', async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET /plans/:id
router.get('/:id', async (req, res, next) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /plans
router.post('/', async (req, res, next) => {
  try {
    const plan = await prisma.plan.create({ data: req.body });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// PATCH /plans/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// DELETE /plans/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.plan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
