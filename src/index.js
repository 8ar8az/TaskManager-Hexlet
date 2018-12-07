import Bottle from 'bottlejs';
import dotenv from 'dotenv';
import initErrorReporting from './lib/rollbar';
import routing from './routes';
import configureApp from './app';

dotenv.config();

const bottle = new Bottle();

bottle.factory('routing', () => routing);

bottle.factory('errorReporting', () => initErrorReporting());

bottle.factory('application', (container) => {
  const application = configureApp(container);
  return application;
});

export default bottle.container.application;
