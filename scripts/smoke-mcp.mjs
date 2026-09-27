import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import process from 'node:process';

const dataDir = await mkdtemp(path.join(tmpdir(), 'motion-mcp-'));
const transport = new StdioClientTransport({command: process.execPath, args: process.env.MOTION_TEST_MCP ? [process.env.MOTION_TEST_MCP] : ['node_modules/tsx/dist/cli.mjs', 'packages/motion-mcp/src/server.ts'], cwd: process.cwd(), env: {...process.env, MOTION_MASTER_DATA_DIR: dataDir}});
const client = new Client({name: 'motion-studio-smoke', version: '0.1.0'});
const parseText = (result) => JSON.parse(result.content.find((item) => item.type === 'text')?.text ?? '{}');
try {
  await client.connect(transport);
  const tools = await client.listTools();
  const probe = parseText(await client.callTool({name: 'motion_system_probe', arguments: {}}));
  const catalog = parseText(await client.callTool({name: 'motion_card_catalog', arguments: {}}));
  await client.callTool({name: 'motion_project_create', arguments: {projectId: 'mcp-smoke', title: 'MCP 烟测', durationFrames: 900}});
  const imported = parseText(await client.callTool({name: 'motion_srt_import', arguments: {projectId: 'mcp-smoke', expectedVersion: 0, srt: '1\n00:00:00,000 --> 00:00:02,000\n首先看完整工作流\n\n2\n00:00:11,000 --> 00:00:13,000\n效率提升 80%'}}));
  const moved = parseText(await client.callTool({name: 'motion_segment_move', arguments: {projectId: 'mcp-smoke', expectedVersion: imported.project.version, groupId: imported.project.timeline.segments[0].groupId, deltaFrames: 6}}));
  const stale = await client.callTool({name: 'motion_style_apply', arguments: {projectId: 'mcp-smoke', expectedVersion: 0, styleProfileId: 'stale'}});
  const validation = parseText(await client.callTool({name: 'motion_project_validate', arguments: {projectId: 'mcp-smoke'}}));
  const history = parseText(await client.callTool({name: 'motion_history_get', arguments: {projectId: 'mcp-smoke', limit: 10}}));
  const result = {toolCount: tools.tools.length, capabilities: probe.capabilities, catalogCount: catalog.length, version: moved.project.version, cards: imported.project.timeline.cards.length, segmentMove: moved.appliedDeltaFrames, staleWriteRejected: stale.isError === true, validationIssues: validation.issues.length, historyEvents: history.length};
  console.log(JSON.stringify(result, null, 2));
  if (catalog.filter(c=>c.cardType.startsWith('hv-')).length !== 23 || !catalog.some(c=>c.cardType==='html-motion') || result.segmentMove !== 6 || !result.capabilities.alphaExport || !result.staleWriteRejected || result.validationIssues !== 0) process.exitCode = 1;
} finally { await client.close(); await rm(dataDir, {recursive: true, force: true}); }
