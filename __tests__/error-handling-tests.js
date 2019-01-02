import request from 'supertest';
import Router from 'koa-router';
import initApplication from '../src';
import initHttpServer from '../src/httpServer';
import testHelpers from './test-helpers/test-helpers';

let httpServer;
let mockReportAboutError;
let error;

beforeAll(async (done) => {
  error = new Error('Ooops!');

  mockReportAboutError = jest.fn();

  const mockRouter = new Router();
  mockRouter.get('/error', () => {
    throw error;
  });
  mockRouter.get('/ok', (ctx) => {
    ctx.status = 204;
  });

  const { logger, sessionParseMiddleware } = await testHelpers.getAppComponents(initApplication());

  const httpServerConfig = {
    router: mockRouter,
    reportAboutError: mockReportAboutError,
    sessionParseMiddleware,
    logger,
  };

  httpServer = initHttpServer(httpServerConfig);
  httpServer.listen(() => {
    done();
  });
});

afterAll((done) => {
  httpServer.close(() => {
    done();
  });
});

test('GET-request to /error', async () => {
  await request(httpServer).get('/error');
  expect(mockReportAboutError.mock.calls[0][0]).toBe(error);
});

test('GET-request to /ok', async () => {
  const response = await request(httpServer).get('/ok');
  expect(response.status).toBe(204);
  expect(mockReportAboutError.mock.calls.length).toBe(1);
});
