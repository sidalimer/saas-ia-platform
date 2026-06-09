import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_MODE = process.env.AI_MODE || 'mock'; // 'mock' | 'gemini'
const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://db-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';

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

// ── Schemas ─────────────────────────────────────────────────────

const promptSchema = z.object({
  userId: z.string().uuid(),
  prompt: z.string().min(1).max(10000),
  model: z.string().optional().default('gemini-2.0-flash'),
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data: any = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  return { content, tokensUsed };
}

// ── POST /ai/prompt ─────────────────────────────────────────────

router.post('/prompt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = promptSchema.parse(req.body);
    const startTime = Date.now();

    let result: { content: string; tokensUsed: number };

    if (AI_MODE === 'gemini' && GEMINI_API_KEY) {
      try {
        result = await geminiResponse(body.prompt, body.model);
      } catch (geminiErr: any) {
        console.error('Gemini failed, falling back to mock:', geminiErr.message);
        result = await mockResponse(body.prompt);
      }
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
        tokensUsed: result.tokensUsed,
        durationMs,
        status: 'COMPLETED',
      }),
    });

    res.json({
      response: result.content,
      model: body.model,
      tokensUsed: result.tokensUsed,
      durationMs,
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
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', available: AI_MODE === 'gemini' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', available: AI_MODE === 'gemini' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', available: AI_MODE === 'gemini' },
      { id: 'mock', name: 'Mock (Development)', available: true },
    ],
  });
});

export default router;
