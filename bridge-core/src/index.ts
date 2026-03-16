// Config
export { initConfig, getConfig } from './config.js';

// Types
export { Attachment, IncomingEmail, CoreConfig, ProcessResult } from './types.js';

// Email utilities
export { extractPubkeyFromEmail, lookupNip05 } from './email.js';

// Nostr
export { giftWrapEmail, createEmailRumor } from './nostr/nip59.js';
export { fetchDMRelays, publishToRelays } from './nostr/client.js';
export { getInboundPrivateKey, getInboundPubkey, getInboundPubkeyBytes, hexToBytes } from './nostr/keys.js';

// Plugin
export { runPlugin, PluginInput, PluginOutput } from './plugin/index.js';

// Processing
export { processIncomingEmail } from './process.js';
