import request from 'supertest';
import initApplication from '../src';
import testHelpers from './test-helpers/test-helpers';

let httpServer;
let router;

beforeAll(async (done) => {
  ({ httpServer, router } = await testHelpers.getAppComponents(initApplication()));

  await httpServer.start(() => {
    done();
  });
});

afterAll(async (done) => {
  await httpServer.close(() => {
    done();
  });
});

test('GET-request to main page', async () => {
  const response = await request(httpServer.getRequestHandler()).get(router.url('index'));
  expect(response.status).toBe(200);
});

test('GET-request to wrong URL', async () => {
  const response = await request(httpServer.getRequestHandler()).get('/wrong-way');
  expect(response.status).toBe(404);
});
