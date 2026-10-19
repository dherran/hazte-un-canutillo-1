import {getStore} from '@netlify/blobs';
import questions from '../../questions.json' with {type:'json'};
const store=()=>getStore({name:'canutillo-partidas',consistency:'strong'});
const uid=()=>crypto.randomUUID();
const SAFE_HINTS=['Piensa en la diferencia entre los componentes de las proteínas y los del material genético.', 'Los territorios de ultramar pueden cambiar mucho el resultado.', 'Atención: se pregunta por el año de la ceremonia, no por el del estreno.', 'La abreviatura procede de un nombre alternativo del elemento.', 'Ocurrió al final de la Guerra Fría, poco antes de la reunificación alemana.', 'El nombre del reino se relaciona con el título del juego.', 'Piensa en un instrumento de concierto de tamaño completo.', 'Busca entre los mamíferos de un grupo evolutivo muy peculiar.', 'Cuenta solo los jugadores que están en la cancha, no los suplentes.', 'La pregunta juega con un nombre que ya conoces.', 'No confundas la duración de un día con la de un año.', 'La ciudad más famosa del país no siempre es su capital.', 'Piensa en una civilización andina anterior a la conquista española.', 'Es una saga de puzles en primera persona.', 'Piensa en un gran director de animación japonesa.', 'El álbum está asociado a un célebre paso de peatones londinense.', 'Se usa al hablar de la puntuación respecto al par.', 'Piensa en un invertebrado marino de ocho brazos.', 'Es un actor que también protagonizó una famosa saga de acción.', 'La revolución comenzó en los últimos años de un siglo.', 'Fíjate en la forma de la península del sur de Europa.', 'El oxígeno no es el gas mayoritario del aire.', 'Piensa en objetos circulares que sirven para protegerse.', 'Recuerda cuál de las dos píldoras permite conocer la realidad.', 'Es uno de los discos más vendidos de la historia del pop.', 'Es un felino especialmente adaptado a los sprints.', 'No cuentes el descanso ni el tiempo añadido.', 'Fue uno de los astronautas de la misión Apolo 11.', 'Piensa en la costa atlántica del norte de Sudamérica.', 'No todas las estructuras celulares contienen la misma cantidad de ADN.', 'Es un apellido muy común en inglés.', 'Piensa en el estudio que creó el juego antes de su compra por una gran empresa.', 'Es una película de terror basada en una novela de Stephen King.', 'Clasifica los instrumentos por cómo producen el sonido, no por su material.', 'El símbolo representa la unión de los continentes.', 'Piensa en el gobernante asociado al final de las guerras napoleónicas.', 'Perú mira hacia el océano situado al oeste de América del Sur.', 'La cifra adulta es menor que la de un recién nacido.', 'Piensa en árboles del género Quercus.', 'Es uno de los grandes villanos de la trilogía original.', 'No confundas al héroe que controlas con el personaje del título.', 'Piensa en un compositor habitual de las películas de Spielberg.', 'Es una banda británica famosa por su cantante de voz inconfundible.', 'La expedición terminó bajo el mando de un marino español.', 'Es un estado independiente situado dentro de una ciudad europea.', 'La unidad lleva el nombre de un físico alemán.', 'Piensa en un ave africana que no vuela.', 'Es una localidad ficticia con un nombre muy común en Estados Unidos.', 'Piensa en un videojuego ambientado en una ciudad submarina.', 'La final se disputó en Sudáfrica.', 'El conflicto empezó tras una crisis internacional en los Balcanes.', 'Está en África oriental y es un macizo volcánico.', 'Es un metal precioso cuyo símbolo químico tiene dos letras.', 'Es una saga de aventuras con piratas y barcos.', 'Piensa en su lugar de nacimiento, no en los países donde trabajó.', 'Es una mayoría de los cinco sets posibles.', 'No basta con planear: debe volar batiendo las alas.', 'Es el juguete que suele liderar al grupo.', 'Es un enemigo verde que conviene mantener a distancia.', 'Piensa en un físico inglés de los siglos XVII y XVIII.'];

const STALE_MS=25000;
const ABANDONED_MS=90000;
const MAX_PLAYERS=10;
const MIN_PLAYERS=2;
const HEARTBEAT_SAVE_MS=8000; // Remove disconnected players from the waiting room after 25 seconds.
const pruneLobby=s=>{if(s.phase!=='lobby')return false;let changed=false;for(const [id,p] of Object.entries(s.players)){if(!p.lastSeen||Date.now()-p.lastSeen>STALE_MS){delete s.players[id];changed=true;}}return changed;};
const blank=()=>({phase:'lobby',round:0,players:{},q:null,deadline:0,used:[],catOptions:[],votes:{},rerollVotes:{},rerollUsed:false,reveal:null,announcement:'',session:uid()});
const abandonInactiveGame=s=>{if(s.phase==='lobby'||!Object.keys(s.players).length)return false;if(Object.values(s.players).some(p=>p.lastSeen&&Date.now()-p.lastSeen<ABANDONED_MS))return false;const used=[...new Set(s.used||[])];Object.assign(s,blank());s.used=used;return true;};
const active=s=>Object.values(s.players).filter(p=>p.balance>0);
const allLocked=s=>active(s).every(p=>p.locked);
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'}});
const pick=(s,cat)=>{let pool=questions.map((x,id)=>({x,id})).filter(o=>!s.used.includes(o.id)&&(!cat||o.x[0]===cat));if(!pool.length)pool=questions.map((x,id)=>({x,id})).filter(o=>!s.used.includes(o.id));if(!pool.length){s.phase='exhausted';s.deadline=0;return;}let {x,id}=pool[Math.floor(Math.random()*pool.length)];s.used.push(id);s.q={id,cat:x[0],text:x[1],options:x.slice(2,6),answer:x[6],hint:SAFE_HINTS[id]||'Piensa en el contexto de la pregunta y descarta opciones imposibles.'};s.round++;s.phase='bet';s.deadline=Date.now()+90000;s.reveal=null;s.rerollVotes={};delete s.powerAlert;s.announcement='Pregunta '+s.round;for(let p of Object.values(s.players)){p.bet=[0,0,0,0];p.locked=p.balance<=0;p.eliminated=[];p.hint='';p.callUntil=0;p.spin=null;p.hiddenAt=0;p.hiddenRound=0;p.penaltyRound=0;}};
const resolve=s=>{if(s.phase!=='bet')return;for(let p of Object.values(s.players)){if(p.balance>0)p.balance=p.bet[s.q.answer]||0;p.locked=true;}s.reveal={answer:s.q.answer,hint:s.q.hint};s.phase='reveal';s.deadline=Date.now()+6500;s.announcement='Respuesta correcta: '+s.q.options[s.q.answer];};
const next=s=>{if(!active(s).length){s.phase='finished';s.deadline=0;s.announcement='Todos los concursantes han sido eliminados.';return;}if(s.round>=15){s.phase='finished';s.deadline=0;return;}if(s.round%3===0){let cats=[...new Set(questions.map(q=>q[0]))].filter(c=>questions.some((q,i)=>q[0]===c&&!s.used.includes(i))).sort(()=>Math.random()-.5);if(cats.length>=2){s.catOptions=cats.slice(0,2);s.votes={};s.phase='category';s.deadline=Date.now()+22000;return;}}pick(s);};
const finishVote=s=>{let [a,b]=s.catOptions,va=Object.values(s.votes).filter(v=>v===a).length,vb=Object.values(s.votes).filter(v=>v===b).length;pick(s,va===vb?(Math.random()<.5?a:b):(va>vb?a:b));};
const tick=s=>{let changed=false;for(let i=0;i<3&&s.deadline&&Date.now()>=s.deadline;i++){if(s.phase==='countdown')pick(s);else if(s.phase==='bet')resolve(s);else if(s.phase==='reveal')next(s);else if(s.phase==='category')finishVote(s);else break;changed=true;}return changed;};
const MIN_AWAY_MS=2500;
const registerReturn=(s,p)=>{
  if(!p.hiddenAt)return false;
  const start=p.hiddenAt, round=p.hiddenRound;
  p.hiddenAt=0;p.hiddenRound=0;
  if(s.phase!=='bet'||round!==s.round||p.balance<=0)return true;
  const unprotectedStart=Math.max(start,p.callUntil||0);
  if(Date.now()-unprotectedStart<MIN_AWAY_MS)return true;
  if(p.penaltyRound===s.round)return true;
  p.penaltyRound=s.round;
  p.infractions=(p.infractions||0)+1;
  if(p.infractions===1)s.announcement='⚠️ '+p.name+': primera salida detectada. Advertencia.';
  else if(p.infractions===2){
    p.balance=Math.floor(p.balance*.75);
    if(p.locked){
      const old=p.bet.reduce((a,b)=>a+b,0);
      if(old>0){
        const next=p.bet.map(x=>Math.floor(x*p.balance/old));
        const index=p.bet.indexOf(Math.max(...p.bet));
        next[index]+=p.balance-next.reduce((a,b)=>a+b,0);
        p.bet=next;
      }
    }
    s.announcement='⚠️ '+p.name+': segunda salida. Pierde el 25 % de sus canutillos.';
  }else{
    p.bet=[0,0,0,0];p.locked=true;
    s.announcement='🚫 '+p.name+': tercera salida. Pierde la apuesta de esta pregunta.';
    if(allLocked(s))resolve(s);
  }
  if(s.phase==='bet'&&allLocked(s))resolve(s);
  s.anticheatAlert={name:p.name,level:Math.min(p.infractions,3),until:Date.now()+6500};
  return true;
};
const pub=(s,id)=>{let p=s.players[id];return {...s,q:s.q?{id:s.q.id,cat:s.q.cat,text:s.q.text,options:s.q.options}:null,players:Object.fromEntries(Object.entries(s.players).map(([k,v])=>[k,{name:v.name,ready:!!v.ready,balance:v.balance,locked:v.locked,used:v.used,spin:k===id?v.spin:null,eliminated:k===id?v.eliminated:[],hint:k===id?v.hint:'',callUntil:k===id?v.callUntil:0,infractions:v.infractions||0,out:v.balance<=0}])),me:p?{...p}:null};};
// Inject the store in tests; production uses Netlify's strongly consistent store.
export const createGameHandler=(getDatabase=store)=>async request=>{
 try{
  const body=request.method==='POST'?await request.json():{};
  const action=body.action||'state',db=getDatabase();
  for(let attempt=0;attempt<12;attempt++){
   const snapshot=await db.getWithMetadata('room',{type:'json'});
   if(snapshot&&!snapshot.etag)return response({error:'El almacenamiento no permite una actualización segura. Inténtalo de nuevo.'},503);
   let s=snapshot?.data||blank(),id=body.id||'';
   const revision=s.revision||0;
   if(action!=='state'&&action!=='join'&&body.session!==s.session)
    return response({error:'La partida ha cambiado. Actualiza la sala.'},409);
   let changed=!snapshot;changed=abandonInactiveGame(s)||changed;changed=tick(s)||changed;changed=pruneLobby(s)||changed;
   if(['bet','power','vote','reroll','visibility'].includes(action)&&
      (body.round!==s.round||body.questionId!==(s.q?.id??null)))
    return response({error:'La pregunta ha cambiado. Actualiza la sala.'},409);
   if(action==='join'){if(s.phase!=='lobby')throw Error('La partida ya empezó');if(Object.keys(s.players).length>=MAX_PLAYERS)throw Error('La sala está llena');let name=String(body.name||'').trim().slice(0,24);if(!name)throw Error('Introduce tu nombre');if(Object.values(s.players).some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Nombre ya utilizado');id=uid();s.players[id]={lastSeen:Date.now(),name,balance:1000000,ready:false,locked:false,bet:[0,0,0,0],used:{wheel:false,hint:false,call:false},spin:null,eliminated:[],hint:'',callUntil:0,hiddenAt:0,hiddenRound:0,penaltyRound:0,infractions:0};changed=true;}
else if(action==='leave'){if(s.phase!=='lobby')throw Error('Solo puedes salir de la sala antes de empezar');if(s.players[id]){delete s.players[id];changed=true;}}
 else if(action==='reset'){if(s.phase!=='lobby')throw Error('Solo puedes reiniciar la sala antes de empezar');if(!s.players[id])throw Error('No estás en la sala');let used=s.used;s=blank();s.used=used;changed=true;}
 else if(action==='visibility'){
  let p=s.players[id];
  if(p){
    if(body.hidden===true){
      if(s.phase==='bet'&&p.balance>0&&!p.hiddenAt){p.hiddenAt=Date.now();p.hiddenRound=s.round;changed=true;}
    }else if(body.hidden===false){
      changed=registerReturn(s,p)||changed;
      p.lastSeen=Date.now();changed=true;
    }
  }
}
else if(action==='ready'){if(s.phase!=='lobby'||!s.players[id])throw Error('No estás en la sala');s.players[id].ready=true;changed=true;if(Object.keys(s.players).length===MAX_PLAYERS&&Object.values(s.players).every(p=>p.ready)){s.phase='countdown';s.deadline=Date.now()+5000;}}
else if(action==='tvstart'){if(s.phase!=='lobby')throw Error('La partida ya empezó');let ps=Object.values(s.players);if(ps.length<MIN_PLAYERS||ps.length>=MAX_PLAYERS||!ps.every(p=>p.ready))throw Error('Se necesitan entre 2 y 9 jugadores preparados');s.phase='countdown';s.deadline=Date.now()+5000;changed=true;}
else if(action==='start'){if(s.phase!=='lobby'||!s.players[id])throw Error('No estás en la sala');let ps=Object.values(s.players);if(ps.length<MIN_PLAYERS||ps.length>MAX_PLAYERS||!ps.every(p=>p.ready))throw Error('Deben estar listos al menos 2 jugadores');s.phase='countdown';s.deadline=Date.now()+5000;changed=true;}
else if(action==='bet'){let p=s.players[id],b=body.bet;if(s.phase!=='bet'||!p||p.balance<=0||p.locked)throw Error('No puedes apostar ahora');if(!Array.isArray(b)||b.length!==4||b.some(v=>!Number.isSafeInteger(v)||v<0)||b.reduce((a,v)=>a+v,0)!==p.balance||b.filter(v=>v>0).length>3||b.some((v,i)=>v>0&&p.eliminated.includes(i)))throw Error('Reparte todo el saldo entre un máximo de 3 opciones válidas');p.bet=b;p.locked=true;changed=true;if(allLocked(s))resolve(s);}
else if(action==='power'){let p=s.players[id],type=body.type;if(s.phase!=='bet'||!p||p.balance<=0||p.locked||!['wheel','hint','call'].includes(type)||p.used[type])throw Error('Comodín no disponible');p.used[type]=true;if(type==='wheel'){p.spin=Math.floor(Math.random()*4);p.eliminated=[0,1,2,3].filter(i=>i!==s.q.answer).sort(()=>Math.random()-.5).slice(0,p.spin);}if(type==='hint')p.hint=s.q.hint;if(type==='call')p.callUntil=Date.now()+40000;s.announcement=p.name+' usa '+({wheel:'la RULETA',hint:'la PISTA',call:'la LLAMADA'}[type]);s.powerAlert={name:p.name,type,until:Date.now()+5000,round:s.round};changed=true;}
else if(action==='vote'){if(s.phase!=='category'||!s.players[id]||s.players[id].balance<=0||!s.catOptions.includes(body.cat))throw Error('No puedes votar ahora');s.votes[id]=body.cat;changed=true;if(Object.keys(s.votes).length===active(s).length)finishVote(s);}
else if(action==='reroll'){if(s.phase!=='bet'||s.round<11||s.rerollUsed||!s.players[id]||s.players[id].balance<=0)throw Error('Re-roll no disponible');s.rerollVotes[id]=true;changed=true;if(Object.entries(s.rerollVotes).filter(([v,yes])=>yes&&s.players[v]?.balance>0).length>=Math.max(1,Math.ceil(active(s).length*0.75))){s.rerollUsed=true;s.round--;pick(s);s.announcement='¡Re-roll aprobado!';}}
else if(action==='new'){if(s.phase!=='finished'&&s.phase!=='exhausted')throw Error('La partida no ha terminado');let used=s.used;s=blank();s.used=used;changed=true;}
else if(action==='tvreset'){if(body.confirm!=='REINICIAR')throw Error('Confirma el reinicio desde la televisión');s=blank();changed=true;}
else if(action!=='state')throw Error('Acción desconocida');
 if(s.players[id]&&action==='state'&&s.players[id].hiddenAt&&body.hidden===false){
  changed=registerReturn(s,s.players[id])||changed;
}
if(s.players[id]&&action!=='leave'&&action!=='reset'){const last=s.players[id].lastSeen||0;s.players[id].lastSeen=Date.now();if(action==='state'&&Date.now()-last>HEARTBEAT_SAVE_MS)changed=true;}
if(s.phase==='countdown'&&Date.now()>=s.deadline){pick(s);changed=true;}
if(changed){
 s.revision=revision+1;
 // A losing writer reloads and reapplies the action, never overwrites newer state.
 const result=await db.setJSON('room',s,snapshot?{onlyIfMatch:snapshot.etag}:{onlyIfNew:true});
 if(!result.modified)continue;
}
return response({state:pub(s,id),id,serverNow:Date.now()});
  }
  return response({error:'La sala está ocupada. Inténtalo de nuevo.'},503);
 }catch(e){return response({error:e.message||'Error del servidor'},400);}
};
export default createGameHandler();
export const config={path:'/api/game'};
