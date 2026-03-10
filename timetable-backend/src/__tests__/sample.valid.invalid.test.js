const request = require('supertest');
const app = require('../app');
const { validateObjectId } = require('../utils/validators');
const constants = require('../utils/constants');

describe('Sample Backend Tests (5 valid, 5 invalid)', () => {
  // Valid tests
  test('valid 1 - constants role is admin', () => {
    expect(constants.ROLES.ADMIN).toBe('admin');
  });

  test('valid 2 - validateObjectId returns middleware function', () => {
    const middleware = validateObjectId('id');
    expect(typeof middleware).toBe('function');
  });

  test('valid 3 - health check endpoint returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'OK', message: 'Server is running' });
  });

  test('valid 4 - unknown route returns 404', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });

  test('valid 5 - regression addition check', () => {
    expect(1 + 2).toBe(3);
  });

  // Intentionally failing tests (skipped)
  test.skip('invalid 1 - wrong constant value', () => {
    expect(constants.ROLES.ADMIN).toBe('superadmin');
  });

  test.skip('invalid 2 - validator does not contain check', () => {
    const chain = validateObjectId('id').toString();
    expect(chain).toContain('isEmail');
  });

  test.skip('invalid 3 - health check expected failure', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(500);
  });

  test.skip('invalid 4 - 404 route returns 200', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(200);
  });

  test.skip('invalid 5 - string mismatch', () => {
    expect('hello').toMatch(/z/);
  });
});