import {createGame,join,start,move,expire,botMove,publicState} from './engine.mjs';
import page from './page.mjs';
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
export class Match {
 constructor(ctx){this.ctx=ctx;}
 async fetch(req){return this.ctx.blockConcurrencyWhile(async()=>{
  const u=new URL(req.url),op=u.pathname.split('/').pop();let g=await this.ctx.storage.get('game'),keys=await this.ctx.storage.get('keys')||{};
  try{
   if(req.method==='GET'){if(!g)return json({error:'Match not found'},404);expire(g);await this.ctx.storage.put('game',g);return json(publicState(g));}
   const b=await req.json();let credential;
   if(op==='create'){if(g)return json({error:'Code already used'},409);if(!Number.isInteger(b.seats)||b.seats<2||b.seats>4)throw Error('Choose 2–4 seats');g=createGame(b.code,b.seats);const p=join(g,b.name);credential=crypto.randomUUID();keys[p.id]=credential;}
   else{
    if(!g)return json({error:'Match not found'},404);expire(g);
    if(op==='join'){const p=join(g,b.name);credential=crypto.randomUUID();keys[p.id]=credential;}
    else{
     const id=Number(b.player),token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token||keys[id]!==token)return json({error:'Seat token required'},403);
     if(op==='start'){if(id!==0)throw Error('Only host starts');if(b.fillBots)while(g.players.length<g.seats)join(g,'Bot '+(g.players.length+1),true);start(g);}
     else if(op==='move'){if(b.version!==g.version)return json({error:'State changed; refresh first'},409);move(g,id,b.action);}
     else return json({error:'Unknown operation'},404);
    }
   }
   let guard=0;while(g.phase==='playing'&&g.players[g.turn].bot&&guard++<40)move(g,g.turn,botMove(g));
   await this.ctx.storage.put({game:g,keys});return json({state:publicState(g),...(credential?{player:g.players.length-1,token:credential}:{})});
  }catch(e){return json({error:e.message},400);}
 });}
}
export default {async fetch(req,env){
 const u=new URL(req.url);if(req.method==='OPTIONS')return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
 if(u.pathname==='/health')return json({ok:true,game:'Relay Isles'});
 if(u.pathname==='/'&&req.method==='GET')return new Response(page,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'public,max-age=300','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'"}});
 let code,op;if(u.pathname==='/api/matches'&&req.method==='POST'){code=crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();op='create';const raw=await req.text();if(raw.length>2048)return json({error:'Body too large'},413);let b;try{b=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}return env.MATCHES.get(env.MATCHES.idFromName(code)).fetch(new Request('https://match/create',{method:'POST',body:JSON.stringify({...b,code})}));}
 const m=u.pathname.match(/^\/api\/matches\/([A-Z0-9]{8})(?:\/(join|start|move))?$/i);if(!m)return json({error:'Not found'},404);code=m[1].toUpperCase();op=m[2]||'state';if((op==='state'&&req.method!=='GET')||(op!=='state'&&req.method!=='POST'))return json({error:'Method not allowed'},405);
 if(Number(req.headers.get('Content-Length')||0)>2048)return json({error:'Body too large'},413);
 return env.MATCHES.get(env.MATCHES.idFromName(code)).fetch(new Request('https://match/'+op,req));
}};
