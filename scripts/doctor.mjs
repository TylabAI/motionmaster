import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import process from 'node:process';

const require = createRequire(import.meta.url);
const chrome = process.env.REMOTION_BROWSER_EXECUTABLE ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const probes = [
  {capability: 'node', command: process.execPath, args: ['--version'], required: true},
  {capability: 'npm', command: process.execPath, args: process.env.npm_execpath ? [process.env.npm_execpath, '--version'] : [], required: true},
  {capability: 'git', command: 'git', args: ['--version'], required: false},
];
const results = probes.map(({capability, command, args, required}) => {
  const run = args.length ? spawnSync(command, args, {encoding: 'utf8'}) : {status: 1, stdout: '', stderr: ''};
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split(/\r?\n/)[0] ?? '';
  return {capability, required, available: run.status === 0, version: run.status === 0 ? output || null : null};
});
const rendererAvailable = (() => { try { require.resolve('@remotion/renderer'); return true; } catch { return false; } })();
const ffprobeAvailable = (() => { try { return existsSync(require('ffprobe-static').path); } catch { return false; } })();
const chromeAvailable = existsSync(chrome);
console.log(JSON.stringify({
  product: 'motion-studio', version: '1.6.2', platform: process.platform,
  capabilities: [...results, {capability: 'chrome', required: true, available: chromeAvailable, path: chrome}, {capability: 'remotion-renderer', required: true, available: rendererAvailable}, {capability: 'ffprobe-static', required: true, available: ffprobeAvailable}],
  render: {previewPlayer: true, stillRender: chromeAvailable && rendererAvailable, mp4Export: chromeAvailable && rendererAvailable, alphaExport: chromeAvailable && rendererAvailable && ffprobeAvailable},
}, null, 2));
if (results.some((item) => item.required && !item.available) || !chromeAvailable || !rendererAvailable || !ffprobeAvailable) process.exitCode = 1;
