import { Store } from 'koa-session2';
import isBefore from 'date-fns/is_before';

const isValidSession = session => (!!session && (isBefore(new Date(), session.expirationDate)));

const getSessionExpirationDate = sessionMaxAge => Date.now() + sessionMaxAge;

export default class SequelizeSessionStore extends Store {
  constructor(sessionModel, sessionLogger) {
    super();
    this.sessionModel = sessionModel;
    this.sessionLogger = sessionLogger;
  }

  async get(sid, ctx) {
    const session = await this.sessionModel.findByPk(sid);
    if (isValidSession(session)) {
      this.sessionLogger("%s | %s | Session with id: '%s' has been read:\n%O", ctx.method, ctx.url, sid, session.get());
      return JSON.parse(session.sessionData);
    }

    this.sessionLogger("%s | %s | Session with id: '%s' is not exist. Has been created empty session", ctx.method, ctx.url, sid);
    return {};
  }

  async set(newSession, options, ctx) {
    const id = options.sid || this.getID(24);
    const expirationDate = getSessionExpirationDate(options.maxAge);

    const [session, isCreated] = await this.sessionModel.findOrCreate({
      where: { id },
      defaults: { sessionData: JSON.stringify(newSession), expirationDate },
    });

    if (!isCreated) {
      await session.update({ sessionData: JSON.stringify(newSession), expirationDate });
    }

    this.sessionLogger("%s | %s | Session with id: '%s' has been saved:\n%O", ctx.method, ctx.url, id, session.get());
    return id;
  }

  async destroy(sid, ctx) {
    const session = await this.sessionModel.findByPk(sid);
    await session.destroy();
    this.sessionLogger("%s | %s | Session with id: '%s' has been deleted", ctx.method, ctx.url, sid);
  }
}
