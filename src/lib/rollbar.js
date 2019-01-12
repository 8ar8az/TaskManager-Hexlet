import Rollbar from 'rollbar';
import _ from 'lodash';

export default () => {
  if (process.env.NODE_ENV !== 'production') {
    return _.noop;
  }

  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.env.NODE_ENV,
    verbose: true,
  });

  return rollbar.error.bind(rollbar);
};
