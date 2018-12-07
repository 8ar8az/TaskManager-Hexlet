import Rollbar from 'rollbar';

export default () => {
  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    rollbar.configure({ enabled: false });
  }

  return rollbar.error.bind(rollbar);
};
