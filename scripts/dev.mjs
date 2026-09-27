import {spawn} from 'node:child_process';

const commands = [
  spawn('npm', ['run', 'api'], {stdio: 'inherit', shell: true}),
  spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4173'], {stdio: 'inherit', shell: true}),
];

const stop = () => commands.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of commands) child.on('exit', (code) => { if (code && code !== 0) { stop(); process.exitCode = code; } });
