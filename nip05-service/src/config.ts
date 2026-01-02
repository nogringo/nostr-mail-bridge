import dotenv from 'dotenv';

dotenv.config();

export const config = {
  bridgePubkey: process.env.BRIDGE_PUBKEY || '',
  userStorePath: process.env.USER_STORE_PATH || './data/users.json',
  httpPort: parseInt(process.env.HTTP_PORT || '3000', 10),
};
