'use strict';

// Lightweight supervisor: keeps server/index.js running by restarting it
// whenever it exits (including native crashes such as 0xC0000409). Uses a
// simple backoff that resets after the child stays up for a while.

const { spawn } = require('node:child_process');
const path = require('node:path');

const entry = path.join(__dirname, 'index.js');
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;
const STABLE_MS = 30000;

let delay = MIN_DELAY_MS;
let shuttingDown = false;

function start() {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [entry], { stdio: 'inherit' });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const uptime = Date.now() - startedAt;
    if (uptime >= STABLE_MS) delay = MIN_DELAY_MS;
    console.error(`[supervisor] server exited (code=${code}, signal=${signal}) after ${uptime}ms; restarting in ${delay}ms`);
    setTimeout(start, delay);
    delay = Math.min(delay * 2, MAX_DELAY_MS);
  });

  child.on('error', (err) => {
    console.error('[supervisor] failed to spawn server:', err);
  });

  const forward = (sig) => () => {
    shuttingDown = true;
    child.kill(sig);
    process.exit(0);
  };
  process.once('SIGINT', forward('SIGINT'));
  process.once('SIGTERM', forward('SIGTERM'));
}

start();
