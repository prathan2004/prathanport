import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(path.join(root,'assets/vendor'),{recursive:true});
await mkdir(path.join(root,'assets/fonts'),{recursive:true});
const files=[['@techstark/opencv-js/dist/opencv.js','opencv.js'],['jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'],['lucide/dist/umd/lucide.min.js','lucide.min.js'],['qrcode-generator/qrcode.js','qrcode.js'],['jsqr/dist/jsQR.js','jsQR.js'],['xlsx/dist/xlsx.full.min.js','xlsx.full.min.js']];
for(const [from,to]of files)await copyFile(path.join(root,'node_modules',from),path.join(root,'assets/vendor',to));
const licenses=[];
for(const name of ['@techstark/opencv-js','jspdf','lucide','qrcode-generator','jsqr','xlsx']){
  const p=JSON.parse(await readFile(path.join(root,'node_modules',name,'package.json'),'utf8'));
  licenses.push(`${name} ${p.version} | ${p.license ?? 'See upstream license'}`);
  for(const file of ['LICENSE','LICENSE.txt','LICENSE.md','LICENSE_MIT'])try{await copyFile(path.join(root,'node_modules',name,file),path.join(root,'assets/vendor',`${name.replaceAll('/','-')}-LICENSE.txt`));break;}catch{}
}
await writeFile(path.join(root,'assets/vendor/VERSIONS.txt'),licenses.join('\n')+'\n');
console.log('Static vendor files copied. No npm install needed on hosting.');
