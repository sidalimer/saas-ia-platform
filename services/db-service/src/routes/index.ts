import { Router } from 'express';
import usersRouter from './users.js';
import plansRouter from './plans.js';
import subscriptionsRouter from './subscriptions.js';
import sessionsRouter from './sessions.js';
import aiRequestsRouter from './ai-requests.js';
import notificationsRouter from './notifications.js';
import paymentsRouter from './payments.js';

const router = Router();

router.use('/users', usersRouter);
router.use('/plans', plansRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/sessions', sessionsRouter);
router.use('/ai-requests', aiRequestsRouter);
router.use('/notifications', notificationsRouter);
router.use('/payments', paymentsRouter);

export default router;
