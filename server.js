import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]==='dist'?'dist':'.');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
async function serveNavigator(req, res) {
  const controller = new AbortController();
  req.once('aborted', () => controller.abort());
  res.once('close', () => { if (!res.writableEnded) controller.abort(); });
  try {
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) {
          res.writeHead(413, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
          res.end(JSON.stringify({error: 'The question request is too large.'}));
          return;
        }
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value != null) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    const {default: navigator} = await import('./api/navigator.js');
    const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
      method: req.method, headers, body, signal: controller.signal,
    });
    const response = await navigator.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (controller.signal.aborted) return;
    console.error('Local Navigator handler failed.');
    res.writeHead(500, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify({error: 'The hosted Navigator is unavailable. Local results remain available.'}));
  }
}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/navigator'){await serveNavigator(req,res);return}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body)}catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('Monad City: http://localhost:5173'));
