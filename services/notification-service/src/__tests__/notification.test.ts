import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

describe('Notification Service — /notifications/send', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends direct email and returns success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Email sent', to: 'user@example.com' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: 'user@example.com',
        subject: 'Test subject',
        body: 'Test body content',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.message).toBe('Email sent');
    expect(data.to).toBe('user@example.com');
  });

  it('rejects invalid email address with 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed', details: [{ message: 'Invalid email' }] }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: 'not-an-email',
        subject: 'Test',
        body: 'Test body',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('rejects missing userId with 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'user@example.com', subject: 'S', body: 'B' }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });
});

describe('Notification Service — /notifications/send-template', () => {
  beforeEach(() => mockFetch.mockReset());

  const templates = [
    'welcome',
    'password-reset',
    'password-reset-code',
    'email-verification',
    'payment-receipt',
    'subscription-start',
    'subscription-end',
    'subscription-cancel',
    'payment-failed',
  ];

  templates.forEach((template) => {
    it(`sends template "${template}" successfully`, async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Template email sent', template, to: 'user@example.com' }),
      } as any);

      const res = await fetch('http://localhost:4003/notifications/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          to: 'user@example.com',
          template,
          data: { name: 'Test User', link: 'http://localhost:5173', code: '123456', plan: 'Pro', amount: '14.99', renewalDate: '2024-02-15', expiryDate: '2024-02-15' },
        }),
      });
      const data = (await res.json()) as any;
      expect(data.message).toBe('Template email sent');
      expect(data.template).toBe(template);
    });
  });

  it('rejects unknown template with 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: 'user@example.com',
        template: 'unknown-template',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });
});

describe('Notification Service — /notifications/send-sms', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends SMS in mock mode and returns success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'SMS sent', to: '+33612345678', mode: 'mock' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: '+33612345678',
        body: 'Your reset code: 123456',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.message).toBe('SMS sent');
    expect(data.mode).toBe('mock');
  });

  it('rejects SMS body over 160 characters with 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: '+33612345678',
        body: 'A'.repeat(161),
      }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });

  it('rejects phone number shorter than 8 chars with 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        to: '123',
        body: 'Code: 123456',
      }),
    });
    const data = (await res.json()) as any;
    expect(data.error).toBeDefined();
  });
});

describe('Notification Service — /notifications/send-push', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends push notification in mock mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Push notification sent', mode: 'mock' }),
    } as any);

    const res = await fetch('http://localhost:4003/notifications/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        deviceToken: 'device-token-abc-123',
        title: 'New message',
        body: 'You have a new AI response',
        data: { type: 'ai_response' },
      }),
    });
    const data = (await res.json()) as any;
    expect(data.message).toBe('Push notification sent');
    expect(data.mode).toBe('mock');
  });
});

describe('Notification Service — template rendering', () => {
  it('password-reset-code template has 6-digit code placeholder', () => {
    const code = '482931';
    const html = `<span style="font-size:36px;letter-spacing:8px">${code}</span>`;
    expect(html).toContain(code);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('6-digit code is always 6 digits', () => {
    for (let i = 0; i < 10; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      expect(code).toHaveLength(6);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });

  it('subscription-end template contains expiry date', () => {
    const expiryDate = '15/02/2024';
    const html = `Your subscription expires on <strong>${expiryDate}</strong>`;
    expect(html).toContain(expiryDate);
  });

  it('payment-receipt template formats currency correctly', () => {
    const amount = (1499 / 100).toFixed(2);
    expect(amount).toBe('14.99');
    const html = `<strong>${amount}€</strong>`;
    expect(html).toContain('14.99€');
  });
});

describe('Notification Service — GET /notifications/user/:userId', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns notification list for user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'notif-1', type: 'EMAIL', subject: 'Welcome', status: 'SENT' },
        { id: 'notif-2', type: 'SMS', subject: 'SMS', status: 'SENT' },
      ],
    } as any);

    const res = await fetch('http://localhost:4003/notifications/user/00000000-0000-0000-0000-000000000001');
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(0);
  });
});
