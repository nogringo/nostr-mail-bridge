import { spawn } from 'child_process';
import { PluginInput, PluginOutput } from './types.js';

const TIMEOUT_MS = 5000;

export async function runPlugin(
  pluginPath: string | undefined,
  input: PluginInput
): Promise<PluginOutput> {
  // If no plugin configured, accept all
  if (!pluginPath) {
    return { id: input.event.from, action: 'accept' };
  }

  return new Promise((resolve, reject) => {
    const child = spawn(pluginPath, [], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let output = '';

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Plugin timeout'));
    }, TIMEOUT_MS);

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Plugin spawn error: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Plugin exited with code ${code}`));
        return;
      }
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        reject(new Error('Invalid plugin output'));
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
