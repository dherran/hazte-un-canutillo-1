import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameHandler} from '../netlify/functions/game.mjs';

// Simulates independent function instances sharing a conditional-write store.
function fixture(){
 let data=null,version=0,conflicts=0;
 const db={
  async getWithMetadata(){await Promise.resolve();return data?{data:structuredClone(data),etag:String(version)}:null;},
  async setJSON(key,next,options){
   await Promise.resolve();
   if(options.onlyIfNew?data!==null:options.onlyIfMatch!==String(version)){conflicts++;return {modified:false};}
   data=structuredClone(next);version++;return {modified:true,etag:String(version)};
  }
 };
 const handler=createGameHandler(()=>db);
 const f={
  get state(){return structuredClone(data);},
  get conflicts(){return conflicts;},
  edit(fn){fn(data);version++;},
  async raw(action='state',extra={}){
   const body={action,session:data?.session,round:data?.round,questionId:data?.q?.id??null,...extra};
   const r=await handler(new Request('http://game/api/game',{method:'POST',body:JSON.stringify(body)}));
   return {status:r.status,...await r.json()};
  },
  async call(action='state',extra={}){const r=await f.raw(action,extra);assert.equal(r.status,200,r.error);return r;},
  async join(name){return (await f.call('join',{name})).id;},
  async start(count=2){
   const ids=[];for(let i=0;i<count;i++)ids.push(await f.join('Jugador '+i));
   for(const id of ids)await f.call('ready',{id});
   if(count<10)await f.call('start',{id:ids[0]});
   f.edit(s=>{s.deadline=Date.now()-1;});await f.call();return ids;
  },
  async expire(){f.edit(s=>{s.deadline=Date.now()-1;});return f.call();}
 };
 return f;
}
const bet=(answer,amount=1000000)=>Array.from({length:4},(_,i)=>i===answer?amount:0);

test('2–9 preparados pueden empezar manualmente desde móvil y TV',async()=>{
 for(let count=2;count<10;count++){
  const f=fixture(),ids=[];
  for(let i=0;i<count;i++)ids.push(await f.join('P'+i));
  assert.equal((await f.raw('tvstart')).status,400);
  for(const id of ids)await f.call('ready',{id});
  assert.equal(f.state.phase,'lobby');
  assert.equal((await f.call(count%2?'tvstart':'start',{id:ids[0]})).state.phase,'countdown');
 }
});
test('un jugador no puede iniciar; diez inician al estar todos listos y no entra el undécimo',async()=>{
 const f=fixture(),ids=[await f.join('P0')];await f.call('ready',{id:ids[0]});
 assert.equal((await f.raw('start',{id:ids[0]})).status,400);
 for(let i=1;i<10;i++)ids.push(await f.join('P'+i));
 assert.equal((await f.raw('join',{name:'Extra'})).status,400);
 for(const id of ids.slice(1,9))await f.call('ready',{id});
 assert.equal(f.state.phase,'lobby');await f.call('ready',{id:ids[9]});assert.equal(f.state.phase,'countdown');
 assert.equal((await f.raw('join',{name:'Tarde'})).status,400);
});
test('altas simultáneas no pierden jugadores ni superan diez plazas',async()=>{
 const f=fixture();await f.call();
 const r=await Promise.all(Array.from({length:11},(_,i)=>f.raw('join',{name:'P'+i})));
 assert.equal(r.filter(x=>x.status===200).length,10);assert.equal(Object.keys(f.state.players).length,10);assert.ok(f.conflicts>0);
});
test('apuestas simultáneas se conservan; eliminados no bloquean la siguiente pregunta',async()=>{
 const f=fixture(),[a,b,c]=await f.start(3),answer=f.state.q.answer;
 await Promise.all([f.call('bet',{id:a,bet:bet(answer)}),f.call('bet',{id:b,bet:bet(answer)}),f.call('bet',{id:c,bet:bet((answer+1)%4)})]);
 assert.equal(f.state.phase,'reveal');assert.equal(f.state.players[c].balance,0);
 assert.equal((await f.call('state',{id:c})).state.players[c].out,true);
 await f.expire();assert.equal(f.state.phase,'bet');
 assert.equal((await f.raw('bet',{id:c,bet:bet(0,0)})).status,400);
 const next=f.state.q.answer;await f.call('bet',{id:a,bet:bet(next)});assert.equal(f.state.phase,'bet');
 await f.call('bet',{id:b,bet:bet(next)});assert.equal(f.state.phase,'reveal');
});
test('el tiempo elimina a quienes no apuestan y todos eliminados terminan antes de 15',async()=>{
 const f=fixture(),[a,b]=await f.start();await f.expire();
 assert.equal(f.state.phase,'reveal');assert.equal(f.state.players[a].balance,0);assert.equal(f.state.players[b].balance,0);
 await f.expire();assert.equal(f.state.phase,'finished');assert.equal(f.state.round,1);
});
test('la pregunta 15 termina incluso con supervivientes',async()=>{
 const f=fixture(),ids=await f.start();f.edit(s=>{s.round=15;});
 for(const id of ids)await f.call('bet',{id,bet:bet(f.state.q.answer)});
 await f.expire();assert.equal(f.state.phase,'finished');
});
test('re-roll cuenta solo vivos, exige 75 %, funciona con un superviviente y solo una vez',async()=>{
 for(const living of [1,2,3,4,5]){
  const f=fixture(),ids=await f.start(6);
  f.edit(s=>{s.round=11;ids.slice(living).forEach(id=>{s.players[id].balance=0;});});
  assert.equal((await f.raw('reroll',{id:ids[living]})).status,400);
  const needed=Math.ceil(living*.75),old=f.state.q.id;
  for(let i=0;i<needed;i++){
   await f.call('reroll',{id:ids[i]});
   assert.equal(f.state.rerollUsed,i===needed-1);
  }
  assert.equal(f.state.round,11);assert.notEqual(f.state.q.id,old);
  assert.equal((await f.raw('reroll',{id:ids[0]})).status,400);
 }
});
test('votación de categoría avanza sin votos de eliminados',async()=>{
 const f=fixture(),[a,b]=await f.start();f.edit(s=>{s.phase='category';s.catOptions=['Ciencia','Historia'];s.votes={};s.players[b].balance=0;});
 assert.equal((await f.raw('vote',{id:b,cat:'Ciencia'})).status,400);
 await f.call('vote',{id:a,cat:'Ciencia'});assert.equal(f.state.phase,'bet');
});
test('reinicio confirmado limpia sesión, participantes, preguntas, comodines y alertas',async()=>{
 const f=fixture(),[a]=await f.start(),old=f.state;
 await f.call('power',{id:a,type:'hint'});
 assert.equal((await f.raw('tvreset')).status,400);
 await f.call('tvreset',{confirm:'REINICIAR'});
 assert.equal(f.state.phase,'lobby');assert.equal(f.state.round,0);assert.deepEqual(f.state.players,{});assert.deepEqual(f.state.used,[]);
 assert.equal(f.state.rerollUsed,false);assert.equal(f.state.powerAlert,undefined);assert.notEqual(f.state.session,old.session);
 assert.equal((await f.raw('ready',{id:a,session:old.session})).status,409);
 assert.equal((await f.raw('tvreset',{confirm:'REINICIAR',session:old.session})).status,409);
 const b=await f.join('Nuevo');assert.equal(f.state.players[b].balance,1000000);
});
test('acciones tardías de otra pregunta se rechazan y no afectan a la actual',async()=>{
 const f=fixture(),[a]=await f.start();const old=f.state;
 f.edit(s=>{s.round++;s.q.id++;});
 for(const action of ['bet','power','visibility','reroll','vote'])assert.equal((await f.raw(action,{id:a,round:old.round,questionId:old.q.id,bet:bet(0),type:'hint',hidden:true})).status,409);
 assert.equal(f.state.players[a].hiddenAt,0);assert.equal(f.state.players[a].used.hint,false);
});
test('comodines se conservan: pista, ruleta y llamada una vez, respuestas ocultas y alertas TV',async()=>{
 const f=fixture(),[a,b]=await f.start();
 const publicState=(await f.call('state',{id:b})).state;assert.equal(publicState.q.answer,undefined);assert.equal(publicState.q.hint,undefined);
 for(const type of ['hint','wheel','call']){
  const r=await f.call('power',{id:a,type});assert.equal(r.state.powerAlert.type,type);
  assert.equal((await f.raw('power',{id:a,type})).status,400);
 }
 assert.ok(f.state.players[a].hint);assert.ok(f.state.players[a].callUntil>Date.now());
 assert.ok(!f.state.players[a].eliminated.includes(f.state.q.answer));
 assert.equal((await f.call('state',{id:b})).state.players[a].hint,'');
});
test('apuestas inválidas se rechazan sin bloquear al jugador',async()=>{
 const f=fixture(),[a]=await f.start();
 for(const values of [[0,0,0,0],[250000,250000,250000,250000],[-1,1000001,0,0],[1.5,999998.5,0,0]])assert.equal((await f.raw('bet',{id:a,bet:values})).status,400);
 assert.equal(f.state.players[a].locked,false);
});
test('antitrampas mantiene advertencia, sanción del 25 % y pérdida de apuesta',async()=>{
 const f=fixture(),[a]=await f.start();
 for(let n=1;n<=3;n++){
  f.edit(s=>{s.round=n;s.players[a].hiddenAt=Date.now()-3000;s.players[a].hiddenRound=n;});
  await f.call('visibility',{id:a,hidden:false});
  assert.equal(f.state.anticheatAlert.level,n);
 }
 assert.equal(f.state.players[a].balance,750000);assert.equal(f.state.players[a].locked,true);assert.deepEqual(f.state.players[a].bet,[0,0,0,0]);
});
test('TV no renueva el latido de un móvil; la sala elimina desconectados',async()=>{
 const f=fixture(),a=await f.join('A');f.edit(s=>{s.players[a].lastSeen=Date.now()-26000;});await f.call();
 assert.equal(f.state.players[a],undefined);
});
test('no escribe sin ETag y limita los reintentos cuando hay conflictos persistentes',async()=>{
 let writes=0;
 const missing=createGameHandler(()=>({getWithMetadata:async()=>({data:{},etag:undefined}),setJSON:async()=>{writes++;}}));
 assert.equal((await missing(new Request('http://game'))).status,503);assert.equal(writes,0);
 const conflict=createGameHandler(()=>({getWithMetadata:async()=>null,setJSON:async()=>{writes++;return {modified:false};}}));
 assert.equal((await conflict(new Request('http://game'))).status,503);assert.equal(writes,12);
});
