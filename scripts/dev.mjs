// Runs the API server + all four Vite+React dev servers concurrently.
// Usage: npm run dev  (or: node scripts/dev.mjs)
import { spawn, execSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isWin = process.platform === 'win32';

const STACK_PORTS = [5000, 5173, 5174, 5175, 5176];

/**
 * Reap stale listeners from a previous run before spawning. The old stack's
 * node processes survive their parent on Windows (taskkill /T is the only
 * reliable cleanup, and Ctrl+C in some terminals never sends it), so the
 * next boot used to die in a cascade: Vite can't bind 5173 → child exits →
 * the fail-fast shutdown below kills the whole new stack. We only ever kill
 * node.exe owners — a foreign app squatting on a port is left alone and
 * still produces the usual clear Vite error.
 */
function reapStaleListeners() {
  if (!isWin) return;
  let listeners;
  try {
    listeners = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return; // netstat unavailable — let the normal bind errors speak
  }
  const pids = new Set();
  for (const line of listeners.split('\n')) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[3] !== 'LISTENING') continue;
    const localPort = Number(columns[1].replace(/^.*:/, ''));
    const pid = Number(columns[4]);
    if (STACK_PORTS.includes(localPort) && pid > 0) pids.add(pid);
  }
  for (const pid of pids) {
    let image = '';
    try {
      image = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch { continue; }
    if (!/^"node\.exe"/i.test(image.trim())) continue; // never kill a non-node owner
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      console.log(`[dev] reaped stale node.exe (pid ${pid}) holding a stack port`);
    } catch { /* already gone */ }
  }
}

reapStaleListeners();

const procs = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'admin',  args: ['--prefix', 'gabfix-administrator', 'run', 'dev'] },
  { name: 'laundry', args: ['--prefix', 'gabfix-laundry-front-office', 'run', 'dev'] },
  { name: 'portal',  args: ['--prefix', 'gabfix-inhouse-erp', 'run', 'dev'] },
  { name: 'store',   args: ['--prefix', 'gabfix-store', 'run', 'dev'] },
].map(({ name, args }) => {
  const child = spawn(npm, args, { shell: true, env: process.env });

  const pipe = (stream, tag) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        console.log(`[${tag}] ${line}`);
      }
    });
  };
  pipe(child.stdout, name);
  pipe(child.stderr, name);

  return { name, child };
});

let exiting = false;

// On Windows, child.kill() only kills the npm.cmd shell wrapper — the spawned
// node processes (vite dev servers, tsx server) survive as orphans and keep
// their ports (5173–5176, 5000) occupied, breaking the next `npm run dev`.
// taskkill /T kills the entire process tree; on POSIX, kill the child first so
// npm forwards SIGTERM to the run-script process it spawned.
const killTree = (child) => {
  if (isWin) {
    if (child.pid != null) {
      try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
    }
  } else {
    child.kill('SIGTERM');
  }
};

const shutdown = (code = 1) => {
  if (exiting) return;
  exiting = true;
  for (const { child } of procs) killTree(child);
  process.exitCode = code;
};

for (const { name, child } of procs) {
  child.on('exit', (code) => {
    if (exiting) return;
    console.log(`[${name}] exited with code ${code}, shutting down...`);
    shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
