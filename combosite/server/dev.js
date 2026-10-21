import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiEntry = join(projectDirectory, 'server', 'index.js');
const viteEntry = join(projectDirectory, 'client', 'node_modules', 'vite', 'bin', 'vite.js');

const api = spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', apiEntry], {
  cwd: projectDirectory,
  stdio: ['inherit', 'pipe', 'inherit'],
});
let client;
let apiOutput = '';
// The watch process forwards server output, including readiness after a restart.
api.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (client) return;
  apiOutput = (apiOutput + chunk.toString()).slice(-4096);
  const ready = apiOutput.match(/Hadoukraft API running on http:\/\/localhost:(\d+)/);
  if (!ready) return;
  client = spawn(process.execPath, [viteEntry, '--host', '0.0.0.0', '--port', '5173'], {
    cwd: join(projectDirectory, 'client'),
    env: { ...process.env, API_PROXY_TARGET: `http://localhost:${ready[1]}` },
    stdio: 'inherit',
  });
  client.on('exit', (code) => { if (code) process.exitCode = code; });
});

const stop = () => {
  api.kill();
  client?.kill();
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => { if (code) process.exitCode = code; });
