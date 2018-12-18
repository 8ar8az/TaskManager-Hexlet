import request from 'supertest';
import initApplication from '../src';

let appContainer;
let server;

beforeAll(async (done) => {
  appContainer = initApplication();
  server = await appContainer.httpServer;

  await server.start(() => {
    done();
  });
});

afterAll(async (done) => {
  await server.close(() => {
    done();
  });
});

test('GET-request to /', async () => {
  const response = await request(server.getRequestHandler()).get('/');
  expect(response.status).toBe(200);
});

test('GET-request to wrong URL', async () => {
  const response = await request(server.getRequestHandler()).get('/wrong-way');
  expect(response.status).toBe(404);
});
