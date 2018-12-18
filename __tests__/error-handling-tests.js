import request from 'supertest';
import Router from 'koa-router';
import initHttpServer from '../src/httpServer';
import logger from '../src/lib/logger';

const error = new Error('Ooops!');
const mockReportAboutError = jest.fn();

let httpServer;

beforeAll((done) => {
  const mockRouter = new Router();
  mockRouter.get('/error', () => {
    throw error;
  });
  mockRouter.get('/ok', (ctx) => {
    ctx.status = 204;
  });

  const mockSessionParseMiddleware = async (ctx, next) => {
    ctx.state.flash = ctx.flash;
    await next();
  };

  const httpServerConfig = {
    router: mockRouter,
    reportAboutError: mockReportAboutError,
    sessionParseMiddleware: mockSessionParseMiddleware,
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
