import Rollbar from 'rollbar';
import _ from 'lodash';

export default (logger) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.initializationLog('Rollbar is used only for production environment. Error reporter is not used');
    return _.noop;
  }

  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.env.NODE_ENV,
  });
  logger.initializationLog('Rollar has been init. Error reporter is ready');

  const reportAboutError = (error, req, ...args) => {
    const callback = (err) => {
      if (err) {
        logger.errorReportingLog('%s | %s | Report has not been sent because:\n%O', req.method, req.url, err);
      } else {
        logger.errorReportingLog('%s | %s | Report has been sent successful', req.method, req.url);
      }
    };

    rollbar.error(error, req, ...args, callback);
  };

  return reportAboutError;
};
