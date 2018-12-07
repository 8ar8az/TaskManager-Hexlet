import request from 'supertest';
import Router from 'koa-router';
import configuredApplication from '../src';
import app from '../src/app';

describe('Routes test', () => {
  let server;

  beforeEach(() => {
    server = configuredApplication.listen();
  });

  afterEach((done) => {
    server.close();
    done();
  });

  test('GET-request to /', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(200);
  });

  test('GET-request to wrong URL', async () => {
    const response = await request(server).get('/wrong-way');
    expect(response.status).toBe(404);
  });
});

describe('Error handling test', () => {
  const error = new Error('Oops!');

  const mockRouting = new Router();
  mockRouting.get('/error', () => {
    throw error;
  });
  mockRouting.get('/ok', (ctx) => {
    ctx.status = 204;
  });

  const mockErrorReporting = jest.fn();

  let server;

  beforeEach(() => {
    server = app({
      routing: mockRouting,
      errorReporting: mockErrorReporting,
    }).listen();
  });

  afterEach((done) => {
    server.close();
    done();
  });

  test('GET-request to /error', async () => {
    await request(server).get('/error');
    expect(mockErrorReporting.mock.calls[0][0]).toBe(error);
  });

  test('GET-request to /ok', async () => {
    const response = await request(server).get('/ok');
    expect(response.status).toBe(204);
    expect(mockErrorReporting.mock.calls.length).toBe(1);
  });
});
