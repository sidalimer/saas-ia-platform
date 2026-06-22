import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_MODE = process.env.AI_MODE || 'mock'; // 'mock' | 'gemini'
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';
const AI_FREE_LIMIT = Number(process.env.AI_FREE_LIMIT) || 20; // requests for users without an active subscription

async function dbRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DB_SERVICE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': INTERNAL_API_KEY,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ── Quota enforcement (per-plan) ────────────────────────────────

interface QuotaInfo {
  allowed: boolean;
  used: number;
  limit: number; // -1 means unlimited
  planName: string;
  subscriptionId: string | null;
}

async function getQuota(userId: string): Promise<QuotaInfo> {
  // Try to find an active subscription with its plan
  const sub = await dbRequest(`/subscriptions/user/${userId}`).catch(() => null);

  if (sub && !sub.error && sub.status === 'ACTIVE' && sub.plan) {
    const limit = sub.plan.aiRequestsLimit;
    const used = sub.aiRequestsUsed || 0;
    const unlimited = limit === -1;
    return {
      allowed: unlimited || used < limit,
      used,
      limit,
      planName: sub.plan.name,
      subscriptionId: sub.id,
    };
  }

  // No active subscription → free tier, count usage from ai_requests history
  const history = await dbRequest(`/ai-requests/user/${userId}?limit=1&offset=0`).catch(() => null);
  const used = history && typeof history.total === 'number' ? history.total : 0;
  return {
    allowed: used < AI_FREE_LIMIT,
    used,
    limit: AI_FREE_LIMIT,
    planName: 'Free',
    subscriptionId: null,
  };
}

// ── Schemas ─────────────────────────────────────────────────────

const promptSchema = z.object({
  userId: z.string().uuid(),
  prompt: z.string().min(1).max(10000),
  model: z.string().optional().default('gemini-2.5-flash-lite'),
});

// ── AI Providers ────────────────────────────────────────────────

async function mockResponse(prompt: string): Promise<{ content: string; tokensUsed: number }> {
  await new Promise((r) => setTimeout(r, 500));
  return {
    content: `[MOCK] This is a simulated AI response to: "${prompt.slice(0, 50)}...".\n\nIn production, this would be powered by Google Gemini or another LLM provider.`,
    tokensUsed: Math.floor(Math.random() * 200) + 50,
  };
}

async function geminiResponse(prompt: string, model: string): Promise<{ content: string; tokensUsed: number }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Si c'est une erreur de quota, on bascule sur le mock ici-même
      if (res.status === 429 || errText.includes('429') || errText.includes('quota')) {
        console.log('[AI] Gemini Quota reached, switching to MOCK internally');
        const mock = await mockResponse(prompt);
        return {
          content: `[NOTE: Quota atteint - Réponse de secours] \n\n${mock.content}`,
          tokensUsed: mock.tokensUsed
        };
      }
      throw new Error(`Gemini API error: ${res.status} - ${errText}`);
    }

    const data: any = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
    return { content, tokensUsed };
  } catch (error: any) {
    // Si l'erreur est déjà un fallback, on la propage
    if (error.message?.includes('[NOTE:')) throw error;
    
    // Pour toute autre erreur réseau/API, on tente aussi un fallback final
    console.error('[AI] Gemini call failed, trying final fallback:', error.message);
    return mockResponse(prompt);
  }
}

// ── POST /ai/prompt ─────────────────────────────────────────────

router.post('/prompt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = promptSchema.parse(req.body);
    const startTime = Date.now();

    let result: { content: string; tokensUsed: number };
    const isGeminiEnabled = AI_MODE === 'gemini';

    console.log(`[AI] Processing prompt. Mode: ${AI_MODE}, Model: ${body.model}`);
    console.log(`[AI] User ID: ${body.userId}`);

    // Enforce per-plan quota before doing any work
    const quota = await getQuota(body.userId);
    console.log(`[AI] Quota check — plan: ${quota.planName}, used: ${quota.used}/${quota.limit === -1 ? '∞' : quota.limit}`);
    if (!quota.allowed) {
      res.status(403).json({
        error: `AI request limit reached for your ${quota.planName} plan (${quota.used}/${quota.limit}). Upgrade your subscription to continue.`,
        quotaExceeded: true,
        plan: quota.planName,
        used: quota.used,
        limit: quota.limit,
      });
      return;
    }

    if (isGeminiEnabled) {
      if (!GEMINI_API_KEY) {
        console.error('[AI] Gemini API key is missing');
        res.status(400).json({ error: 'Gemini API key is not configured' });
        return;
      }
      result = await geminiResponse(body.prompt, body.model);
    } else {
      result = await mockResponse(body.prompt);
    }

    const durationMs = Date.now() - startTime;

    // Store request in DB
    await dbRequest('/ai-requests', {
      method: 'POST',
      body: JSON.stringify({
        userId: body.userId,
        prompt: body.prompt,
        response: result.content,
        model: body.model,
        tokens: result.tokensUsed,
        durationMs,
        status: 'COMPLETED',
      }),
    });

    // Increment usage counter on the active subscription (free tier is counted via ai_requests rows)
    if (quota.subscriptionId) {
      await dbRequest(`/subscriptions/${quota.subscriptionId}/increment-usage`, {
        method: 'POST',
      }).catch(() => { /* non-blocking */ });
    }

    res.json({
      response: result.content,
      model: body.model,
      tokensUsed: result.tokensUsed,
      durationMs,
      usage: { used: quota.used + 1, limit: quota.limit, plan: quota.planName },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
});

// ── GET /ai/history/:userId ─────────────────────────────────────

router.get('/history/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dbRequest(`/ai-requests/user/${req.params.userId}?limit=50&offset=0`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── GET /ai/models ──────────────────────────────────────────────

router.get('/models', (_req: Request, res: Response) => {
  res.json({
    mode: AI_MODE,
    models: [
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', available: AI_MODE === 'gemini' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', available: AI_MODE === 'gemini' },
      { id: 'mock', name: 'Mock (Development)', available: true },
    ],
  });
});

export default router;
