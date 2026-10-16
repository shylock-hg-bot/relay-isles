export const SITES=[{name:'Sunspire',x:1,y:0,kind:'sun'},{name:'North Reef',x:0,y:1,kind:'reef'},{name:'Glass Harbor',x:1,y:1,kind:'harbor'},{name:'East Reef',x:2,y:1,kind:'reef'},{name:'Ember Dock',x:0,y:2,kind:'harbor'},{name:'The Relay',x:1,y:2,kind:'relay'},{name:'Moon Dock',x:2,y:2,kind:'harbor'},{name:'West Reef',x:0,y:3,kind:'reef'},{name:'Low Harbor',x:1,y:3,kind:'harbor'},{name:'South Reef',x:2,y:3,kind:'reef'},{name:'Moonspire',x:1,y:4,kind:'sun'}];
export const EVENTS=[{name:'Harbor lights',kind:'harbor'},{name:'Reef bloom',kind:'reef'},{name:'Relay surge',kind:'relay'},{name:'Twin suns',kind:'sun'}];
export function createGame(code,seats=2){return {code,seats,phase:'lobby',players:[],sites:SITES.map(s=>({...s,owner:null,fort:0})),round:1,turn:0,version:0,log:[],winner:[],createdAt:Date.now()};}
export function join(g,name,bot=false){if(g.phase!=='lobby'||g.players.length>=g.seats)throw Error('Lobby is full or already started');const p={id:g.players.length,name:String(name||'Captain').trim().slice(0,24)||'Captain',bot,energy:5,score:0};g.players.push(p);g.version++;return p;}
export function start(g){if(g.phase!=='lobby'||g.players.length!==g.seats)throw Error('Fill all seats before starting');g.phase='playing';g.startedAt=Date.now();g.log.push({event:'start',players:g.players.map(p=>p.name)});g.version++;}
function adjacent(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;}
export function cost(g,p,i){const t=g.sites[i];if(t.owner===p.id)return null;const connected=g.sites.some(s=>s.owner===p.id&&adjacent(s,t));return 2+(t.owner===null?0:2+t.fort)-(connected?1:0);}
export function legal(g,pid){if(g.phase!=='playing'||g.turn!==pid)return [];const p=g.players[pid],a=[{type:'charge'},{type:'signal'}];g.sites.forEach((s,i)=>{if(s.owner!==pid&&cost(g,p,i)<=p.energy)a.push({type:'claim',site:i});if(s.owner===pid&&s.fort<2&&p.energy>=2)a.push({type:'fortify',site:i});});return a;}
export function move(g,pid,a,now=Date.now()){
 if(!a||!legal(g,pid).some(x=>x.type===a.type&&x.site===a.site))throw Error('Illegal move or not your turn');
 const p=g.players[pid],before={energy:p.energy,score:p.score};let label;
 if(a.type==='charge'){p.energy=Math.min(12,p.energy+4);label='charged +4 energy';}
 if(a.type==='signal'){p.score+=1;p.energy=Math.min(12,p.energy+1);label='sent a signal +1 point, +1 energy';}
 if(a.type==='claim'){const t=g.sites[a.site],fee=cost(g,p,a.site);p.energy-=fee;label=`${t.owner===null?'claimed':'captured'} ${t.name} for ${fee} energy`;t.owner=pid;t.fort=0;}
 if(a.type==='fortify'){g.sites[a.site].fort++;p.energy-=2;label=`fortified ${g.sites[a.site].name}`;}
 g.log.push({event:'move',round:g.round,player:pid,action:a,label,before,after:{energy:p.energy,score:p.score}});
 g.turn++;
 if(g.turn===g.players.length){
  g.turn=0;const e=EVENTS[(g.round-1)%EVENTS.length],income=g.players.map(()=>0);
  for(const s of g.sites)if(s.owner!==null)income[s.owner]+=1+(s.kind===e.kind?1:0);
  for(const q of g.players){q.score+=income[q.id];q.energy=Math.min(12,q.energy+2);}
  g.log.push({event:'tide',round:g.round,name:e.name,points:income});g.round++;
 }
 if(g.round>8||now-g.startedAt>=9*60*1000){g.phase='finished';const best=Math.max(...g.players.map(q=>q.score));g.winner=g.players.filter(q=>q.score===best).map(q=>q.id);g.log.push({event:'finish',winner:g.winner});}
 g.version++;return g;
}
export function expire(g,now=Date.now()){if(g.phase==='playing'&&now-g.startedAt>=9*60*1000){g.phase='finished';const best=Math.max(...g.players.map(q=>q.score));g.winner=g.players.filter(q=>q.score===best).map(q=>q.id);g.log.push({event:'finish',winner:g.winner,reason:'nine-minute limit'});g.version++;}}
export function botMove(g){const p=g.players[g.turn],a=legal(g,p.id);let best=a[0],bestScore=-Infinity;for(const m of a){let v=0;if(m.type==='charge')v=p.energy<=3?4:0.1;if(m.type==='signal')v=1.2;if(m.type==='fortify')v=(g.round<5?0.7:0.1);if(m.type==='claim'){const s=g.sites[m.site],remaining=9-g.round,e=EVENTS[(g.round-1)%4];v=remaining*(s.owner===null?0.7:1.15)+(s.kind===e.kind?1:0)-cost(g,p,m.site)*0.3;if(s.kind==='relay')v+=0.1;}if(v>bestScore){bestScore=v;best=m;}}return best;}
export function publicState(g){return {...g,event:EVENTS[(Math.min(g.round,8)-1)%4],legalMoves:g.phase==='playing'?legal(g,g.turn):[],remainingSeconds:g.phase==='playing'?Math.max(0,Math.ceil((g.startedAt+540000-Date.now())/1000)):0};}
