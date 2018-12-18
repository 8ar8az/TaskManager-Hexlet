import debug from 'debug';

const databaseLog = debug('task-manager:db');
const initializationLog = debug('task-manager:init');
const httpSessionLog = debug('task-manager:http-session');
const errorReportingLog = debug('task-manager:error-reporter');
const mainProcessLog = debug('task-manager:main-process');

export default {
  databaseLog,
  initializationLog,
  httpSessionLog,
  errorReportingLog,
  mainProcessLog,
};
