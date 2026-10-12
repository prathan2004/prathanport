import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/exam'){res.writeHead(301,{Location:'/exam/'});res.end();return;}
  if(!pathname.startsWith('/exam/')){res.writeHead(404);res.end();return;}
  const relative=decodeURIComponent(pathname.slice(6))||'index.html';
  if(relative!=='index.html'&&!relative.startsWith('assets/')&&!relative.startsWith('fonts/')){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,relative);
  if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
  try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.EXAM_TEST_URL=`http://127.0.0.1:${server.address().port}/exam/`;
try{await import('./browser.mjs');console.log('PASS: static /exam/ deployment without Vite or source files');}finally{await new Promise(resolve=>server.close(resolve));}
