// Percival Labs - Auth Tests

import { describe, test, expect } from 'bun:test';
import { createToken, verifyToken } from '../src/auth/jwt';

describe('JWT Auth', () => {
  test('creates and verifies token', async () => {
    const token = await createToken({
      sub: 'pub-123',
      github_id: '12345',
      display_name: 'Test User',
    });

    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('pub-123');
    expect(payload!.github_id).toBe('12345');
    expect(payload!.display_name).toBe('Test User');
    expect(payload!.iat).toBeGreaterThan(0);
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
  });

  test('rejects tampered token', async () => {
    const token = await createToken({
      sub: 'pub-123',
      github_id: '12345',
      display_name: 'Test User',
    });

    // Tamper with payload
    const parts = token.split('.');
    const tampered = `${parts[0]}.${btoa('{"sub":"hacked","github_id":"999","display_name":"Hacker","iat":0,"exp":9999999999}').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${parts[2]}`;

    const payload = await verifyToken(tampered);
    expect(payload).toBeNull();
  });

  test('rejects invalid format', async () => {
    expect(await verifyToken('')).toBeNull();
    expect(await verifyToken('not.a.valid.token')).toBeNull();
    expect(await verifyToken('abc')).toBeNull();
  });

  test('token has 7-day expiry', async () => {
    const token = await createToken({
      sub: 'pub-123',
      github_id: '12345',
      display_name: 'Test User',
    });

    const payload = await verifyToken(token);
    const expectedExpiry = 7 * 24 * 3600; // 7 days in seconds
    const actualExpiry = payload!.exp - payload!.iat;
    expect(actualExpiry).toBe(expectedExpiry);
  });
});
