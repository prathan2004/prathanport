import { readFile, writeFile, mkdir, readdir, copyFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(app, 'dist');
const upload = resolve(app, 'upload', 'lanna');
await rename(resolve(dist, 'template.html'), resolve(dist, 'index.html'));
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
if (html.includes('/src/main.tsx') || !html.includes('./assets/')) throw Error('Invalid static build');

async function filesIn(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}
// Publish only the compiled entry, compiled assets and the two public images.
// Do not ship the standalone root SPA redirect into a shared hosting directory.
const files = (await filesIn(dist)).filter(path => {
  const name = relative(dist, path).split(sep).join('/');
  return ['index.html','favicon.svg','og-image.png'].includes(name) || name.startsWith('assets/');
});
for (const source of files) {
  const name = relative(dist, source);
  for (const destination of [resolve(app, name), resolve(upload, name)]) {
    if (!destination.startsWith(app + sep)) throw Error('Output is outside the application');
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}
// Remove only stale generated bundles; leave other user-added assets untouched.
const currentAssets = new Set(files.map(path=>relative(dist,path).split(sep).join('/')));
for (const parent of [app, upload]) {
  const assetDir = resolve(parent,'assets');
  if (dirname(assetDir)!==parent || !assetDir.startsWith(app+sep)) throw Error('Invalid assets directory');
  for (const entry of await readdir(assetDir,{withFileTypes:true})) {
    if (entry.isFile() && /^(template|favicon)-[\w-]+\.(js|css|svg)$/.test(entry.name) && !currentAssets.has('assets/'+entry.name)) {
      await unlink(resolve(assetDir,entry.name));
    }
  }
}

// Small portable ZIP writer using standard-library compression; no runtime dependency.
const crcTable = Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data) { let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0; }
async function archive(prefix) {
  const local=[], central=[];let offset=0;
  for(const path of files.sort()) {
    const name=Buffer.from(prefix+relative(dist,path).split(sep).join('/'));
    const data=await readFile(path), compressed=deflateRawSync(data), crc=crc32(data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);
    local.push(header,name,compressed);central.push(directory,name);offset+=header.length+name.length+compressed.length;
  }
  const directory=Buffer.concat(central), end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
await writeFile(resolve(app,'upload','lanna-upload.zip'),await archive('lanna/'));
await writeFile(resolve(app,'lanna-netlify.zip'),await archive(''));
console.log('Static site ready: lanna/index.html + assets/ (no server build needed)');
console.log('Upload folder: '+upload);
console.log('Upload ZIP: '+resolve(app,'upload','lanna-upload.zip'));
