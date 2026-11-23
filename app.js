'use strict';

/* SensorBridge Emulator: browser-side mathematical DEMO and experimental BLE client.
 * Does not control or represent validated analogue hardware.
 */
const SERVICE_UUID = 'eaa10000-29f1-4a63-9d72-fd49d8b6c100';
const WRITE_UUID   = 'eaa10001-29f1-4a63-9d72-fd49d8b6c100';
const STATUS_UUID  = 'eaa10002-29f1-4a63-9d72-fd49d8b6c100';
const defaults = Object.freeze({ excitation:5, span:2, offset:0, pressure:50, temperature:25, tk0:0, tke:0, nonlinearity:0, drift:0, ptcEnabled:false, ptcR25:10000, ptcPpm:4000 });
let state = { ...defaults };
let device = null, writeCharacteristic = null, statusCharacteristic = null;
const $ = id => document.getElementById(id);
const num = (x,f=3) => Number(x).toFixed(f);
const clamp = (v,min,max)=> Math.min(max,Math.max(min,v));
const escapeText = s => String(s);
const ranges = { excitation:[.1,5.5], span:[1,4], offset:[-1000,1000], pressure:[0,100], temperature:[-40,125], tk0:[-5000,5000], tke:[-50000,50000], nonlinearity:[-20,20], drift:[-100000,100000], ptcR25:[100,1e7], ptcPpm:[-10000,20000] };
const wireKeys = Object.keys(defaults);
function validate(raw) {
  if (!raw || typeof raw !== 'object') throw Error('Ungültiges Profil');
  const result = {...defaults};
  for(const key of wireKeys) {
    if (!(key in raw)) continue;
    if(key==='ptcEnabled') { if(typeof raw[key]!=='boolean') throw Error('PTC muss Boolean sein'); result[key]=raw[key]; continue; }
    const v=Number(raw[key]); if(!Number.isFinite(v)) throw Error('Ungültiger Zahlenwert für '+key);
    const [lo,hi]=ranges[key]; if(v<lo||v>hi) throw Error('Ausserhalb Bereich: '+key);
    result[key]=v;
  }
  return result;
}
function model(s,p=s.pressure,t=s.temperature) {
  const fraction=p/100, delta=t-25, spanMilliVolt=s.span*s.excitation;
  const output = s.offset
     + s.tk0 * delta * s.excitation / 1000
     + spanMilliVolt * (1+s.tke*delta/1e6)*fraction
     + spanMilliVolt * (s.nonlinearity/100)*4*fraction*(1-fraction)
     + s.drift/1000;
  const r=10000, normalized=output/(s.excitation*1000), dr=r*normalized;
  const resistanceValid=Math.abs(normalized)<1;
  const r1=r-dr, r2=r+dr, r3=r+dr, r4=r-dr;
  const ptcR=s.ptcR25*(1+s.ptcPpm*delta/1e6);
  const totalCurrentMilliAmp=s.excitation/10000*1000 + (s.ptcEnabled && ptcR>0 ? s.excitation/ptcR*1000:0);
  return {out:output, mvPerV:output/s.excitation, spanMilliVolt, r1,r2,r3,r4, rin:10000, vcm:s.excitation/2, ptcR, totalCurrentMilliAmp, resistanceValid};
}
function uiNotice(msg,kind='info'){const e=$('notice');e.textContent=msg;e.style.borderColor=kind==='error'?'#a85556':'#315b59';e.style.color=kind==='error'?'#ffd4d4':'#9fdace';}
function setMode(connected){$('modeChip').textContent=connected?'BLE · PROTOTYP':'DEMO · KEINE HARDWARE';$('connectionBadge').textContent=connected?'● Verbunden':'● Offline';$('connectionBadge').style.color=connected?'#4cd8bc':'#ffb95a';$('connectBtn').classList.toggle('hidden',connected);$('disconnectBtn').classList.toggle('hidden',!connected);$('sendBtn').disabled=!connected;$('readBtn').disabled=!connected;$('hardwareTag').textContent=connected?'BLE PROTOTYP':'DEMO';}
function renderChart(){
  const svg=$('curve'), width=760,height=320,left=50,right=18,top=12,bottom=32;
  const data=[0,25,75].map(t=>({temp:t,points:Array.from({length:101},(_,p)=>model(state,p,t).out)}));
  let values=data.flatMap(d=>d.points);values.push(model(state).out);let min=Math.min(...values),max=Math.max(...values),padding=Math.max(1,(max-min)*.08);min-=padding;max+=padding;
  const x=p=>left+p/100*(width-left-right),y=v=>height-bottom-(v-min)/(max-min)*(height-top-bottom);
  const path=(points)=>points.map((v,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(v).toFixed(2)).join(' ');
  let lines='';
  for(let i=0;i<=4;i++){const xx=x(i*25),yy=top+(height-top-bottom)*i/4, val=max-(max-min)*i/4;lines+=`<line x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}" stroke="#314357" stroke-width="1"/><line x1="${xx}" x2="${xx}" y1="${top}" y2="${height-bottom}" stroke="#283747"/><text x="${left-7}" y="${yy+4}" text-anchor="end" font-size="11" fill="#8da4b4">${num(val,2)}</text>`;}
  let result=lines;
  for(const [i,d] of data.entries())result+=`<path d="${path(d.points)}" fill="none" stroke="${['#739bf7','#4cd8bc','#ffb95a'][i]}" stroke-width="2.3" stroke-linecap="round"/>`;
  const current=model(state),cx=x(state.pressure),cy=y(current.out);
  result+=`<line x1="${cx}" x2="${cx}" y1="${top}" y2="${height-bottom}" stroke="#dcecf2" opacity=".35" stroke-dasharray="5 5"/><circle cx="${cx}" cy="${cy}" r="5.5" fill="#f4f8fc" stroke="#17283b" stroke-width="2"/>`;
  svg.innerHTML=result;
}
function render(){
  const m=model(state);
  $('outMv').innerHTML=num(m.out,5)+' <em>mV</em>';
  $('outMvV').textContent=num(m.mvPerV,5)+' mV/V';
  $('fullMv').innerHTML=num(m.spanMilliVolt,3)+' <em>mV</em>';
  $('spanText').textContent=num(state.span,3)+' mV/V';
  $('excMetric').innerHTML=num(state.excitation,3)+' <em>V</em>';
  $('conditionMetric').innerHTML=num(state.pressure,1)+' <em>%</em>';
  $('temperatureMetric').textContent=num(state.temperature,1)+' °C';
  $('r1').textContent=num(m.r1,2)+' Ω';$('r2').textContent=num(m.r2,2)+' Ω';$('r3').textContent=num(m.r3,2)+' Ω';$('r4').textContent=num(m.r4,2)+' Ω';
  $('rin').textContent='10.000 kΩ';$('vcm').textContent=num(m.vcm,3)+' V';$('ptcState').textContent=state.ptcEnabled?'An':'Aus';
  $('bridgeText').textContent='10 kΩ nominal · mathematisch';
  $('ptcHint').textContent=state.ptcEnabled?`PTC-Modell: ${num(m.ptcR,1)} Ω; idealer Strom gesamt: ${num(m.totalCurrentMilliAmp,4)} mA. Realer Brückenstrom hängt von den Shunts ab.`:'PTC-Zweig getrennt. Keine zusätzliche Stromaufnahme im mathematischen Modell.';
  if(!m.resistanceValid)uiNotice('Warnung: Der gewünschte Offset ist bei dieser Speisung mit dem idealisierten passiven Brückenmodell nicht physikalisch möglich.','error');
  renderChart();
}
function syncForm(){for(const key of Object.keys(ranges)) {const n=$(key), nr=$(key+'Number');if(n) n.value=state[key];if(nr)nr.value=state[key];}$('ptcEnabled').checked=state.ptcEnabled;render();}
function updateValue(key,val){if(key==='ptcEnabled')state[key]=Boolean(val);else{let n=Number(val);if(!Number.isFinite(n))return;const [lo,hi]=ranges[key];state[key]=clamp(n,lo,hi);}syncForm();}
for(const key of Object.keys(ranges))for(const id of [key,key+'Number']){const el=$(id);if(el)el.addEventListener('input',e=>updateValue(key,e.target.value));}
$('ptcEnabled').addEventListener('change',e=>updateValue('ptcEnabled',e.target.checked));
document.querySelectorAll('[data-pressure]').forEach(b=>b.addEventListener('click',()=>updateValue('pressure',Number(b.dataset.pressure))));
$('resetBtn').addEventListener('click',()=>{state={...defaults};syncForm();uiNotice('Standardprofil wiederhergestellt. Keine Hardwareänderung.')});
$('saveBtn').addEventListener('click',()=>{const a=document.createElement('a'),blob=new Blob([JSON.stringify({schema:'sensorbridge-profile/v1',parameters:state},null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='sensorbridge-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
$('importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try {const imported=JSON.parse(await f.text());state=validate(imported.parameters||imported);syncForm();uiNotice('Profil geladen (nur lokal).');}catch(err){uiNotice('Profil konnte nicht geladen werden: '+err.message,'error');}e.target.value='';});
function onDisconnect(){writeCharacteristic=null;statusCharacteristic=null;device=null;setMode(false);uiNotice('BLE getrennt. Demo-Modus aktiv.');}
async function connectBLE(){
 if(!navigator.bluetooth){uiNotice('Web Bluetooth ist hier nicht verfügbar. Verwende Chrome/Edge auf HTTPS oder localhost.','error');return;}
 try{
   device=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'SensorBridge'}],optionalServices:[SERVICE_UUID]});
   device.addEventListener('gattserverdisconnected',onDisconnect);
   const server=await device.gatt.connect();
   const service=await server.getPrimaryService(SERVICE_UUID);
   writeCharacteristic=await service.getCharacteristic(WRITE_UUID);
   statusCharacteristic=await service.getCharacteristic(STATUS_UUID);
   setMode(true);uiNotice('BLE verbunden: '+escapeText(device.name||'SensorBridge')+'. Nur Prototyp-Protokoll; Analogausgabe nicht verifiziert.');
   await readStatus();
 }catch(err){onDisconnect();uiNotice('BLE-Verbindung fehlgeschlagen: '+err.message,'error');}
}
async function readStatus(){
 if(!statusCharacteristic)return;
 try{const data=await statusCharacteristic.readValue();const msg=new TextDecoder().decode(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));const obj=JSON.parse(msg);uiNotice('Gerätestatus: '+(obj.status||obj.error||msg)+(obj.analogueEnabled?' · Achtung: Ausgang aktiv':' · analog nicht freigegeben'));}catch(err){uiNotice('Gerätestatus konnte nicht gelesen werden: '+err.message,'error');}
}
async function send(){
 if(!writeCharacteristic)return;
 try {
   const fields=['excitation','span','offset','pressure','temperature','tk0','tke','nonlinearity','drift','ptcEnabled','ptcR25','ptcPpm'];
   for(let i=0;i<fields.length;i++){
     // Short one-setting command (~18 bytes), works on conservative BLE MTUs.
     const val=fields[i]==='ptcEnabled'?(state.ptcEnabled?1:0):state[fields[i]];
     const payload=JSON.stringify({v:1,k:'0123456789ab'[i],x:val});
     const encoded=new TextEncoder().encode(payload);
     if(encoded.length>20)throw Error('BLE-Wert zu gross ('+fields[i]+')');
     await writeCharacteristic.writeValueWithResponse(encoded);
   }
   await readStatus();
   uiNotice('12 Parameter an BLE-Prototyp übertragen. Analoger Ausgang bleibt unbestätigt bzw. deaktiviert.');
 }catch(err){uiNotice('Befehl fehlgeschlagen: '+err.message,'error');}
}

$('connectBtn').addEventListener('click',connectBLE);$('disconnectBtn').addEventListener('click',()=>device?.gatt?.disconnect());$('readBtn').addEventListener('click',readStatus);$('sendBtn').addEventListener('click',send);
syncForm();setMode(false);
