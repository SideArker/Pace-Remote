import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../packages/protocol/src/index.ts', import.meta.url);
const target = new URL('../../Pace-remote-host/src/remote/protocol.ts', import.meta.url);
const content = await readFile(source, 'utf8');
if (process.argv.includes('--check')) {
  if (content !== await readFile(target, 'utf8')) throw new Error('Pace remote protocol is out of sync');
} else await writeFile(target, content);
