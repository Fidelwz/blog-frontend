// Isolated synthetic Nest contract, never forwards requests to a real service.
import { createServer } from 'node:http';
const author = { id:'7',firstName:'Ana',lastName:'Pruebas' };
const date = '2026-11-18T12:00:00Z';
const comment = (id,content,status='visible',parent=null,owner=author) => ({id,postId:'9',content,status,parent,author:owner,createdAt:date});
let items, calls, fault, reportStatus, notices;
function reset() {
  items = [comment('12','Respuesta con padre fuera de página','visible',{id:'10',content:null},{id:'8',firstName:'Bruno',lastName:'Pruebas'}),comment('11',null,'deleted'),comment('10','Mi comentario')];
  calls = []; fault = null; reportStatus = 'pending';
  notices = ['105','104','103'].map(id=>({id,type:'comment',message:`Aviso ${id}`,href:id==='103'?null:'/posts/9',createdAt:date,readAt:null}));
}
reset();
const server = createServer(async (req,res) => {
  const url = new URL(req.url,'http://127.0.0.1:4023');
  let raw=''; for await(const chunk of req) raw+=chunk;
  const body=raw?JSON.parse(raw):{};
  const send=(data,status=200,headers={})=>{res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(status===204?undefined:JSON.stringify(data));};
  if(url.pathname==='/__reset'){reset();return send({ok:true});}
  if(url.pathname==='/__fault'){fault=body;return send({ok:true});}
  if(url.pathname==='/__calls')return send(calls);
  const path=url.pathname.replace(/^\/api\/v1/,'');
  calls.push({path,query:url.search,method:req.method,body,cookie:req.headers.cookie,owner:req.headers['x-post-owner']});
  if(fault && path===fault.path && req.method===fault.method){const status=fault.status;fault=null;return send({message:'private upstream stack'},status,{'X-Request-ID':'f171fb3a-9a16-4f90-8c62-61f7e0cbdb46','Retry-After':'2'});}
  if(path==='/auth/me')return req.headers.cookie?.includes('jwt=mock.comments')?send({...author,id:7,email:'ana@example.test',role:'administrador',status:'activo',photoUrl:null}):send({},401);
  if(path==='/notifications/unread/count')return send({count:notices.filter(n=>!n.readAt).length});
  if(path==='/notifications' && req.method==='GET'){
    const filtered=notices.filter(n=>(url.searchParams.get('unread')!=='true'||!n.readAt)&&(!url.searchParams.get('cursor')||BigInt(n.id)<BigInt(url.searchParams.get('cursor'))));
    return send({items:filtered.slice(0,2),nextCursor:filtered.length>2?filtered[1].id:null,unreadCount:notices.filter(n=>!n.readAt).length});
  }
  if(path.startsWith('/notifications/') && req.method==='PATCH'){
    for(const n of notices)if(path==='/notifications/read'?BigInt(n.id)<=BigInt(body.throughId):path===`/notifications/${n.id}/read`)n.readAt=date;
    return send(null,204);
  }
  if(path==='/posts/9')return send({id:'9',authorId:'8',categoryId:'1',groupId:null,group:null,title:'Conversación de prueba',content:'<p>Contenido académico de prueba.</p>',status:'visible',permissions:{edit:false,moderate:true},version:1,createdAt:date,updatedAt:null,author:{id:'8',firstName:'Bruno',lastName:'Pruebas',photoUrl:null},category:{id:'1',name:'Cálculo'},commentCount:items.length,attachments:[]});
  if(path==='/posts/9/comments' && req.method==='GET'){
    const start=url.searchParams.has('cursor')?items.findIndex(c=>c.id===url.searchParams.get('cursor'))+1:0;
    const limit=Number(url.searchParams.get('limit')??2), page=items.slice(start,start+limit);
    return send({items:page,nextCursor:start+limit<items.length?page.at(-1).id:null});
  }
  if(path==='/posts/9/comments' && req.method==='POST'){
    const row=comment(String(100+items.length),body.content,body.content.includes('retener')?'retained':'visible',body.parentCommentId?{id:body.parentCommentId,content:items.find(c=>c.id===body.parentCommentId)?.content??null}:null);
    items.unshift(row);return send(row,201);
  }
  if(path.startsWith('/comments/') && req.method==='DELETE'){const row=items.find(c=>c.id===path.split('/').at(-1));if(!row)return send({},404);row.status='deleted';row.content=null;return send(null,204);}
  if(path==='/reports' && req.method==='POST')return send({id:'51',status:'pendiente'},201);
  const report={id:'51',reason:'Motivo de prueba',status:reportStatus,observation:null,createdAt:date,postId:'9',groupId:null,title:'Conversación de prueba',content:'Comentario reportado',type:'comment',targetId:'12',contentStatus:'visible'};
  if(path==='/moderation/reports')return send({items:[report],nextCursor:null});
  if(path==='/moderation/reports/51' && req.method==='GET')return send(report);
  if(path==='/moderation/reports/51' && req.method==='PATCH'){reportStatus='dismissed';return send(null,204);}
  if(path==='/moderation/retained')return send({items:[{id:'99',type:'comment',postId:'9',title:'Comentario retenido',content:'Revisar comentario',version:null}],nextCursor:null});
  if(path==='/moderation/retained/comment/99' && req.method==='PATCH')return send(null,204);
  return send({},404);
});
server.listen(4023,'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
