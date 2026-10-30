const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const FILE=path.join(__dirname,'data.json');
let D={};try{D=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){}
let tm;const save=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFile(FILE,JSON.stringify(D),()=>{}),1000)};
const srv=http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/api/admin'){
    let b='';req.on('data',c=>{b+=c;if(b.length>2000)req.destroy()});
    req.on('end',()=>{try{const {u,p}=JSON.parse(b);
      res.statusCode=(u===(process.env.ADMIN_USER||'admin')&&p===(process.env.ADMIN_PASS||'Admin@1234'))?200:401}catch(e){res.statusCode=400}res.end()});return}
  fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(d)})});
const wss=new WebSocketServer({server:srv}),subs=new Map();
wss.on('connection',ws=>{
  ws.on('message',m=>{let q;try{q=JSON.parse(m)}catch(e){return}
    if(q.op==='hi'){ws.user=String(q.name||'').slice(0,40);return}
    if(q.op==='online'){ws.send(JSON.stringify({id:q.id,data:[...new Set([...wss.clients].filter(w=>w.user&&w.readyState===1).map(w=>w.user))]}));return}
    if(typeof q.path!=='string'||q.path.length>40)return;
    if(q.op==='get')ws.send(JSON.stringify({id:q.id,data:D[q.path]||null}));
    else if(q.op==='set'){D[q.path]=q.data;save();
      (subs.get(q.path)||[]).forEach(w=>{if(w!==ws&&w.readyState===1)w.send(JSON.stringify({path:q.path,data:q.data}))})}
    else if(q.op==='sub'){if(!subs.has(q.path))subs.set(q.path,new Set());subs.get(q.path).add(ws)}
    else if(q.op==='unsub'&&subs.has(q.path))subs.get(q.path).delete(ws)});
  ws.on('close',()=>subs.forEach(s=>s.delete(ws)))});
setInterval(()=>wss.clients.forEach(w=>w.ping()),30000);
srv.listen(process.env.PORT||3000,()=>console.log('running'));
