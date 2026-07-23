import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiEntry = join(projectDirectory, 'server', 'index.js');
const viteEntry = join(projectDirectory, 'client', 'node_modules', 'vite', 'bin', 'vite.js');

const api = spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', apiEntry], {
  cwd: projectDirectory,
  stdio: 'inherit',
});
const client = spawn(process.execPath, [viteEntry, '--host', '0.0.0.0', '--port', '5173'], {
  cwd: join(projectDirectory, 'client'),
  stdio: 'inherit',
});

const stop = () => {
  api.kill();
  client.kill();
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => { if (code) process.exitCode = code; });
client.on('exit', (code) => { if (code) process.exitCode = code; });
