import faker from 'faker';
import request from 'supertest';

faker.locale = 'ru';

const generateTestUserData = () => ({
  firstname: faker.name.firstName(),
  lastname: faker.name.lastName(),
  email: `${faker.internet.domainWord()}@${faker.internet.domainName()}`,
  password: faker.internet.password(8),
});

const createTestUser = async (userModel, userData) => userModel.create(userData);

const userSingIn = async (httpServer, user, password) => {
  const response = await request(httpServer)
    .post('/session')
    .type('form')
    .send({ email: user.email, password });

  return response.header['set-cookie'];
};

export {
  generateTestUserData,
  createTestUser,
  userSingIn,
};
