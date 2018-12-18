import path from 'path';
import _ from 'lodash';
import SequelizeSessionStore from './SequelizeSessionStore';

export default (sequelize, logger) => {
  const pathToSessionModel = path.resolve(__dirname, 'Session');
  const Session = sequelize.import(pathToSessionModel);
  logger.initializationLog('ORM model for HTTP-session has been init');

  const sessionStore = new SequelizeSessionStore(Session, logger.httpSessionLog);
  logger.initializationLog('Store for HTTP-session has been created');

  const sessionConfig = {
    key: 'session_id',
    maxAge: 604800000, // one week
    httpOnly: true,
    signed: true,
    overwrite: true,
    store: sessionStore,
  };

  logger.initializationLog('HTTP-session has been init with config:\n%O', _.omit(sessionConfig, 'store'));
  return sessionConfig;
};
