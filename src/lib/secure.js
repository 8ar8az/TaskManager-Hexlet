import crypto from 'crypto';

const secret = process.env.SECRET_KEY || 'abcdef';

export default value => crypto.createHmac('sha256', secret)
  .update(value)
  .digest('hex');
