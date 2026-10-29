// Production entry for a single container (Liara): runs the web and worker processes side by side (PRD §11).
// If either exits, the other is stopped and we exit non-zero, so the platform restarts the container.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dist = (file) => fileURLToPath(new URL(`../dist/${file}`, import.meta.url));
const children = ['server.js', 'worker.js'].map((file) =>
  spawn(process.execPath, ['--env-file-if-exists=.env', dist(file)], { stdio: 'inherit' }),
);

let stopping = false;
function stopAll(signal) {
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${child.spawnargs.at(-1)} exited (${signal ?? code}); stopping`);
      stopAll('SIGTERM');
    }
    if (children.every((c) => c.exitCode !== null || c.signalCode !== null)) process.exit(stopping && code === 0 ? 0 : 1);
  });
}

process.once('SIGTERM', () => stopAll('SIGTERM'));
process.once('SIGINT', () => stopAll('SIGINT'));
