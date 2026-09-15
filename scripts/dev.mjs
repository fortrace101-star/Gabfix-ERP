// Runs the client (Vite) and server (Express) dev processes concurrently.
// No dependencies: spawns both with npm and prefixes their output.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const procs = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'client', args: ['--prefix', 'client', 'run', 'dev'] },
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

const shutdown = (code = 1) => {
  if (exiting) return;
  exiting = true;
  for (const { child } of procs) child.kill();
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
