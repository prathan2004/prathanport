import {mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),target=path.join(root,'release/exam');
await mkdir(target,{recursive:true});
for(const name of ['index.html','css','js','assets','README.md','netlify.toml'])await cp(path.join(root,name),path.join(target,name),{recursive:true});
console.log('Ready: release/exam contains only the static application. Add it to the complete prathanport upload.');
