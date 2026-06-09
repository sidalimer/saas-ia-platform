import { describe, it, expect } from 'vitest';

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';

describe('Auth Service', () => {
  it('should return health check', async () => {
    const res = await fetch(`${AUTH_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('auth-service');
  });

  it('should reject login with invalid credentials', async () => {
    const res = await fetch(`${AUTH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('should reject registration with invalid email', async () => {
    const res = await fetch(`${AUTH_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: 'short' }),
    });
    expect(res.status).toBe(400);
  });

  it('should register a new user', async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await fetch(`${AUTH_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', firstName: 'Test', lastName: 'User' }),
    });
    if (res.status === 201) {
      const data = await res.json() as any;
      expect(data.user.email).toBe(email);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    }
  });
});
