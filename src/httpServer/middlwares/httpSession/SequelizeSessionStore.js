import { Store } from 'koa-session2';
import isBefore from 'date-fns/is_before';

const isValidSession = session => (!!session && (isBefore(new Date(), session.expirationDate)));

const getSessionExpirationDate = sessionMaxAge => Date.now() + sessionMaxAge;

export default class SequelizeSessionStore extends Store {
  constructor(sessionModel) {
    super();
    this.sessionModel = sessionModel;
  }

  async get(sid) {
    const session = await this.sessionModel.findByPk(sid);
    if (isValidSession(session)) {
      return JSON.parse(session.sessionData);
    }

    return {};
  }

  async set(newSession, options) {
    const id = options.sid || this.getID(24);
    const expirationDate = getSessionExpirationDate(options.maxAge);

    const [session, isCreated] = await this.sessionModel.findOrCreate({
      where: { id },
      defaults: { sessionData: JSON.stringify(newSession), expirationDate },
    });

    if (!isCreated) {
      await session.update({ sessionData: JSON.stringify(newSession), expirationDate });
    }

    return id;
  }

  async destroy(sid) {
    const session = await this.sessionModel.findByPk(sid);
    await session.destroy();
  }
}
