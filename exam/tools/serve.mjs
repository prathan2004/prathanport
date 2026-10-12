import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function createServer(){return http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let relative=decodeURIComponent(url.pathname);
  if(relative==='/exam'){res.writeHead(301,{Location:'/exam/'});res.end();return;}
  if(relative.startsWith('/exam/'))relative=relative.slice(5);
  if(relative==='/'||relative==='')relative='/index.html';
  const file=path.resolve(root,'.'+relative);
  if(!file.startsWith(root)||relative.includes('.npm-cache')||relative.includes('.git')){res.writeHead(403);res.end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.json':'application/json'};
  try{if(!(await stat(file)).isFile())throw new Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT??5173),server=createServer();server.listen(port,'0.0.0.0',()=>console.log(`Smart Exam Checker: http://localhost:${port}/exam/`));server.on('error',e=>{console.error(e.message);process.exitCode=1;});
}
