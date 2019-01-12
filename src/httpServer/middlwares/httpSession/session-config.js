import path from 'path';
import _ from 'lodash';
import SequelizeSessionStore from './SequelizeSessionStore';

export default (sequelize, logger) => {
  const pathToSessionModel = path.resolve(__dirname, 'Session');
  const Session = sequelize.import(pathToSessionModel);
  logger.log('ORM model for HTTP-session has been init');

  const sessionStore = new SequelizeSessionStore(Session);
  logger.log('Store for HTTP-session has been created');

  const sessionConfig = {
    key: 'session_id',
    maxAge: 604800000, // one week
    httpOnly: true,
    signed: true,
    overwrite: true,
    store: sessionStore,
  };

  logger.log('HTTP-session config has been formed:\n%O', _.omit(sessionConfig, 'store'));
  return sessionConfig;
};
