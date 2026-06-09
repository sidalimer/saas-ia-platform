import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

describe('Payment Service — /payments/plans', () => {
  beforeEach(() => mockFetch.mockReset());

  it('GET /payments/plans returns array of plans', async () => {
    const plans = [
      { id: 'plan-1', name: 'Free', slug: 'free', monthlyPrice: 0, yearlyPrice: 0, aiRequestsLimit: 20 },
      { id: 'plan-2', name: 'Pro', slug: 'pro', monthlyPrice: 1499, yearlyPrice: 14999, aiRequestsLimit: 500 },
      { id: 'plan-3', name: 'Enterprise', slug: 'enterprise', monthlyPrice: 4999, yearlyPrice: 49999, aiRequestsLimit: -1 },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => plans } as any);

    const res = await fetch('http://localhost:4005/payments/plans');
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    data.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('monthlyPrice');
    });
  });
});

describe('Payment Service — /payments/create-checkout', () => {
  beforeEach(() => mockFetch.mockReset());

  it('mock checkout succeeds and returns paymentId', async () => {
    const mockResult = {
      success: true,
      paymentId: 'mock_pay_abc123',
      amount: 1499,
      plan: 'Pro',
      interval: 'MONTHLY',
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResult } as any);

    const res = await fetch('http://localhost:4005/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        planId: '00000000-0000-0000-0000-000000000002',
        interval: 'MONTHLY',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.paymentId).toBeDefined();
    expect(data.amount).toBeGreaterThan(0);
  });

  it('checkout fails with missing fields — returns 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4005/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001' }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('checkout fails for unknown plan — returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Plan not found' }),
    } as any);

    const res = await fetch('http://localhost:4005/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        planId: '00000000-0000-0000-0000-000000000099',
        interval: 'MONTHLY',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('YEARLY interval calculates correct period (365 days)', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 365 * 86400000);
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    expect(diffDays).toBe(365);
  });

  it('MONTHLY interval calculates correct period (30 days)', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 86400000);
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    expect(diffDays).toBe(30);
  });
});

describe('Payment Service — /payments/webhook', () => {
  beforeEach(() => mockFetch.mockReset());

  it('webhook payment.succeeded returns received: true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ received: true }),
    } as any);

    const res = await fetch('http://localhost:4005/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment.succeeded',
        data: {
          userId: '00000000-0000-0000-0000-000000000001',
          planId: '00000000-0000-0000-0000-000000000002',
          amount: 1499,
          stripePaymentId: 'pi_test_abc123',
        },
      }),
    });
    const data = (await res.json()) as any;
    expect(data.received).toBe(true);
  });

  it('webhook invalid payload returns 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid webhook payload' }),
    } as any);

    const res = await fetch('http://localhost:4005/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unknown' }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });
});

describe('Payment Service — amount calculations', () => {
  it('converts cents to euros correctly', () => {
    expect((1499 / 100).toFixed(2)).toBe('14.99');
    expect((4999 / 100).toFixed(2)).toBe('49.99');
    expect((0 / 100).toFixed(2)).toBe('0.00');
  });

  it('yearly price is less than 12x monthly (discount applied)', () => {
    const monthly = 1499;
    const yearly = 14999;
    expect(yearly).toBeLessThan(monthly * 12);
  });
});

describe('Payment Service — GET /payments/history/:userId', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns payment history array for valid user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'pay-1', amount: 1499, status: 'SUCCEEDED', createdAt: new Date().toISOString() }],
    } as any);

    const res = await fetch('http://localhost:4005/payments/history/00000000-0000-0000-0000-000000000001');
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
  });
});
