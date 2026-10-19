import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
const lobby=()=>({phase:'lobby',session:'session-a',round:0,q:null,deadline:0,players:{},me:null});
async function client({tv=false,storedId='',fetcher}={}){
 const app={innerHTML:'',insertAdjacentHTML(_,value){this.innerHTML+=value;}},buttons=[],requests=[],storage=new Map([['canutillo-player',storedId]]);
 let state=lobby();
 const document={hidden:false,activeElement:null,body:{classList:{add(){}},appendChild(b){buttons.push(b);}},createElement(){return {};},getElementById(id){return id==='app'?app:null;},querySelectorAll(){return [];},querySelector(){return null;},addEventListener(){}};
 const context=vm.createContext({URLSearchParams,location:{search:tv?'?modo=tv':'',origin:'http://game',pathname:'/'},document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval(){},window:{addEventListener(){}},confirm:()=>true,fetch:async(_,opts)=>{
  const body=JSON.parse(opts.body);requests.push(body);
  return fetcher?fetcher(body):{ok:true,json:async()=>({state:structuredClone(state),id:body.id,serverNow:Date.now()})};
 }});
 vm.runInContext(script,context);await vm.runInContext('requestQueue',context);
 return {app,buttons,requests,storage,document,context,run:code=>vm.runInContext(code,context),setState:s=>{state=s;}};
}

test('TV mantiene Reiniciar partida fuera del render de preguntas y pide confirmación',async()=>{
 const c=await client({tv:true,storedId:'mobile-id'});
 assert.equal(c.buttons.length,1);assert.equal(c.buttons[0].textContent,'Reiniciar partida');assert.equal(c.requests[0].id,'');
 c.context.confirm=()=>false;await c.buttons[0].onclick();assert.equal(c.requests.length,1);
 c.context.confirm=()=>true;await c.buttons[0].onclick();assert.equal(c.requests.at(-1).action,'tvreset');assert.equal(c.requests.at(-1).confirm,'REINICIAR');
 assert.equal(c.requests.at(-1).session,'session-a');
 assert.match(html,/\.tv-reset-fixed\{[^}]*position:fixed;[^}]*right:14px;z-index:10000/);
});
test('peticiones del móvil se serializan para impedir respuestas fuera de orden',async()=>{
 let pending=0,max=0;
 const c=await client({fetcher:async body=>{pending++;max=Math.max(max,pending);await new Promise(resolve=>setTimeout(resolve,5));pending--;return {ok:true,json:async()=>({state:lobby(),id:body.id,serverNow:Date.now()})};}});
 await Promise.all([c.run('api()'),c.run("api('visibility',{hidden:true})"),c.run('api()')]);assert.equal(max,1);
});
test('reset de sesión limpia identidad antigua, borrador y edición del móvil',async()=>{
 const c=await client({storedId:'old-player'});
 c.run("id='old-player';draft=[1000000,0,0,0];editing=true");
 c.setState({...lobby(),session:'new-session'});await c.run('api()');
 assert.equal(c.run('id'),'');assert.equal(c.storage.has('canutillo-player'),false);assert.equal(c.run('editing'),false);assert.equal(c.run('draft.reduce((a,b)=>a+b,0)'),0);
});
test('el móvil sale de la edición al terminar la pregunta aunque el campo tenga foco',async()=>{
 const c=await client();c.document.activeElement={dataset:{bet:'0'}};
 const player={name:'A',balance:1000000,locked:false,used:{},eliminated:[]};
 const s={...lobby(),phase:'bet',round:1,q:{id:0,cat:'Ciencia',text:'Pregunta',options:['A','B','C','D']},me:player,players:{a:player},rerollVotes:{}};
 c.setState(s);await c.run('api()');c.run('editing=true;draft=[1000000,0,0,0]');
 c.setState({...s,phase:'reveal',reveal:{answer:0},me:{...player,locked:true}});await c.run('api();');c.run('render()');
 assert.equal(c.run('editing'),false);assert.match(c.app.innerHTML,/Respuesta correcta/);
});
test('reloj usa la hora del servidor incluso con un desfase grande del dispositivo',async()=>{
 const c=await client({fetcher:async body=>({ok:true,json:async()=>({state:{...lobby(),deadline:Date.now()+65000},id:body.id,serverNow:Date.now()+60000})})});
 assert.ok(c.run('clock()')>=4&&c.run('clock()')<=6);
});
