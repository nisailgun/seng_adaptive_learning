#!/usr/bin/env node
const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const processes = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'client', args: ['--prefix', 'client', 'run', 'dev'] }
];

const children = [];
let shuttingDown = false;

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  children.forEach(({ proc }) => {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  });

  // Give the child processes a moment to exit before terminating the parent.
  setTimeout(() => process.exit(code), 500);
};

processes.forEach(({ name, args }) => {
  const proc = spawn(npmCmd, args, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  children.push({ name, proc });

  proc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${name}] exited (${reason}). Stopping other process...`);
    shutdown(code ?? 1);
  });

  proc.on('error', (err) => {
    if (shuttingDown) return;
    console.error(`[${name}] failed to start`, err);
    shutdown(1);
  });
});

process.on('SIGINT', () => {
  console.log('\nStopping dev processes...');
  shutdown(0);
});

process.on('SIGTERM', () => shutdown(0));
