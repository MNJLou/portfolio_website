// Minimal static server for the portfolio. Usage: node serve.js [port]
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=process.argv[2]||8080;
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';
  const fp=path.join(root,p);
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(fp)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(port,()=>console.log('Portfolio running at http://localhost:'+port));
