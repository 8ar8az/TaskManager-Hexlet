import Bottle from 'bottlejs';
import dotenv from 'dotenv';
import getRollbar from './lib/rollbar';
import routing from './routes';
import configureApp from './app';

dotenv.config();

const bottle = new Bottle();

bottle.factory('routing', () => routing);

bottle.factory('errorReporting', () => {
  const rollbar = getRollbar();

  const errorReporting = (error, request) => {
    rollbar.error(error, request);
  };

  return errorReporting;
});

bottle.factory('application', (container) => {
  const application = configureApp(container);
  return application;
});

export default bottle.container.application;
