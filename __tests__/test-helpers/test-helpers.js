import faker from 'faker';
import request from 'supertest';

faker.locale = 'ru';

const generateUserData = () => ({
  firstname: faker.name.firstName(),
  lastname: faker.name.lastName(),
  email: `${faker.internet.domainWord()}@${faker.internet.domainName()}`,
});

const generateUserPassword = () => faker.internet.password(8);

const createUser = async (userModel, password) => {
  const userData = { ...generateUserData(), password };
  const user = await userModel.create(userData);
  return user;
};

const userSingIn = async (httpServer, user, password) => {
  const response = await request(httpServer.getRequestHandler())
    .post('/session')
    .type('form')
    .send({ email: user.email, password });

  return response.header['set-cookie'];
};

const getAppComponents = async (appContainer) => {
  const { logger, reportAboutError } = appContainer;
  const database = await appContainer.database;
  const models = await appContainer.models;
  const sessionConfig = await appContainer.sessionConfig;
  const sessionParseMiddleware = await appContainer.sessionParseMiddleware;
  const router = await appContainer.router;
  const httpServer = await appContainer.httpServer;

  return {
    logger,
    reportAboutError,
    database,
    models,
    sessionConfig,
    sessionParseMiddleware,
    router,
    httpServer,
  };
};

export default {
  generateUserData,
  generateUserPassword,
  createUser,
  userSingIn,
  getAppComponents,
};
