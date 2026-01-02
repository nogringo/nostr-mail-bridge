import { CoreConfig } from './types.js';

let _config: CoreConfig | null = null;

export function initConfig(config: CoreConfig): void {
  _config = config;
}

export function getConfig(): CoreConfig {
  if (!_config) {
    throw new Error('Config not initialized. Call initConfig() first.');
  }
  return _config;
}
