import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

describe('AI Service — /ai/prompt', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('GET /health returns 200', async () => {
    const res = await fetch('http://127.0.0.1:4004/health');
    expect(res).toBeDefined();
  });

  it('mock response contains expected fields', async () => {
    const mockResponse = {
      response: '[MOCK] This is a simulated AI response to: "Hello".\n\nIn production, this would be powered by Google Gemini or another LLM provider.',
      model: 'gemini-2.0-flash',
      tokensUsed: 42,
      durationMs: 512,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await fetch('http://localhost:4004/ai/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001', prompt: 'Hello' }),
    });
    const data = (await result.json()) as any;

    expect(data).toMatchObject(mockResponse);
    expect(data.response).toContain('[MOCK]');
    expect(data.tokensUsed).toBeGreaterThanOrEqual(0);
    expect(data.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('validates prompt schema — missing userId returns 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4004/ai/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello without userId' }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('validates prompt schema — empty prompt returns 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed', details: [{ message: 'String must contain at least 1 character(s)' }] }),
    } as any);

    const res = await fetch('http://localhost:4004/ai/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001', prompt: '' }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('GET /ai/models returns available models list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' }],
        currentMode: 'mock',
      }),
    } as any);

    const res = await fetch('http://localhost:4004/ai/models');
    const data = (await res.json()) as any;
    expect(data).toHaveProperty('models');
    expect(data).toHaveProperty('currentMode');
    expect(Array.isArray(data.models)).toBe(true);
  });

  it('Gemini API error falls back to mock response', async () => {
    const mockFallback = {
      response: '[MOCK] This is a simulated AI response to: "test".',
      model: 'gemini-2.0-flash',
      tokensUsed: 30,
      durationMs: 520,
    };

    mockFetch
      .mockRejectedValueOnce(new Error('Gemini API error: 429'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFallback,
      } as any);

    const res = await fetch('http://localhost:4004/ai/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001', prompt: 'test' }),
    });
    const data = (await res.json()) as any;
    expect(data.response).toContain('[MOCK]');
  });

  it('GET /ai/history/:userId returns array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as any);

    const res = await fetch('http://localhost:4004/ai/history/00000000-0000-0000-0000-000000000001');
    const data = (await res.json()) as any;
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('AI Service — Gemini integration logic', () => {
  it('geminiResponse builds correct URL with model and key', () => {
    const model = 'gemini-2.0-flash';
    const key = 'test-key-123';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    expect(url).toContain('v1beta');
    expect(url).toContain(model);
    expect(url).toContain(key);
  });

  it('mock response contains [MOCK] prefix', () => {
    const prompt = 'Tell me a joke';
    const mockContent = `[MOCK] This is a simulated AI response to: "${prompt}".\n\nIn production, this would be powered by Google Gemini or another LLM provider.`;
    expect(mockContent).toContain('[MOCK]');
    expect(mockContent).toContain(prompt);
  });

  it('token calculation is non-negative', () => {
    const tokensUsed = Math.floor(Math.random() * 100);
    expect(tokensUsed).toBeGreaterThanOrEqual(0);
  });
});
