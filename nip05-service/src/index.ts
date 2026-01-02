import express from 'express';
import { config } from './config';
import { JsonUserStore } from './store/json';

const app = express();
const store = new JsonUserStore(config.userStorePath);

app.get('/.well-known/nostr.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name = req.query.name as string | undefined;

  if (!name) {
    return res.status(400).json({ error: 'name parameter required' });
  }

  // Special case: _smtp returns the bridge pubkey
  if (name === '_smtp') {
    if (!config.bridgePubkey) {
      return res.status(500).json({ error: 'bridge pubkey not configured' });
    }
    return res.json({ names: { _smtp: config.bridgePubkey } });
  }

  const user = await store.findByName(name);
  if (!user) {
    return res.status(404).json({ error: 'not found' });
  }

  res.json({ names: { [user.name]: user.pubkey } });
});

app.listen(config.httpPort, () => {
  console.log(`NIP-05 service running on port ${config.httpPort}`);
});
