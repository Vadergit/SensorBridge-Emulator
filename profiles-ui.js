'use strict';
// Expected-limits and corner-point editor. All comparisons are against the
// mathematical DEMO model, not real sensor or AD5270 measurements.
const expectedKeys = new Set(window.SensorBridgeCharacteristics.expectedDefinitions.map(d=>d.key));

function parseOptionalBound(value){
 if(value==null || value==='')return null;
 if(typeof value!=='number' && typeof value!=='string')throw Error('Ungültiger Grenzwert');
 const number=Number(value);
 if(!Number.isFinite(number)||Math.abs(number)>1e9)throw Error('Grenzwert ausserhalb des zulässigen Zahlenbereichs');
 return number;
}
function parseExpectedLimits(obj){
 if(!obj || typeof obj!=='object'||Array.isArray(obj))throw Error('Ungültige Grenzwertliste');
 const parsed={};
 for(const [key,limit] of Object.entries(obj)){
  if(!expectedKeys.has(key))continue;
  if(!limit || typeof limit!=='object')throw Error('Ungültige Grenzen: '+key);
  parsed[key]={min:parseOptionalBound(limit.min),max:parseOptionalBound(limit.max)};
 }
 return parsed;
}
function parseTestPoints(arr,settings){
 if(!Array.isArray(arr)||arr.length>100)throw Error('Prüfpunkte müssen eine Liste mit maximal 100 Einträgen sein');
 return arr.map((point,i)=>{
  if(!point||typeof point!=='object')throw Error('Ungültiger Prüfpunkt: '+(i+1));
  const temperature=Number(point.temperature);
  const pressureValue=point.pressureValue!=null?Number(point.pressureValue):
    PRESSURE.physical(Number(point.pressure),settings.pressureMin,settings.pressureMax);
  if(!Number.isFinite(pressureValue)||Math.abs(pressureValue*PRESSURE.units[settings.pressureUnit].factor)>1e9)throw Error('Ungültiger Druck an Punkt '+(i+1));
  const pressure=PRESSURE.percent(pressureValue,settings.pressureMin,settings.pressureMax);
  if(!Number.isFinite(temperature)||temperature< -40||temperature>125)throw Error('Temperatur ausserhalb von −40 bis 125 °C an Punkt '+(i+1));
  const direction=point.direction??'up';
  if(direction!=='up'&&direction!=='down')throw Error('Unbekannte Belastungsrichtung');
  return {pressure,pressureValue,temperature,direction,min:parseOptionalBound(point.min),max:parseOptionalBound(point.max)};
 });
}
function makeTableCell(row,content,className){
 const td=document.createElement('td');
 if(className)td.className=className;
 if(content instanceof Node)td.append(content);
 else if(content!=null)td.textContent=String(content);
 row.append(td);return td;
}
function makeNumberField(value,field,placeholder='frei'){
 const input=document.createElement('input');
 input.type='number';input.step='any';input.placeholder=placeholder;
 input.dataset.field=field;
 if(value!==null && value!==undefined)input.value=String(value);
 input.setAttribute('aria-label',field);
 return input;
}
function makeStatus(){
 const status=document.createElement('span');
 status.className='status-pill';
 status.textContent='—';
 return status;
}
function statusLabel(status){
 return status==='pass'?'Innerhalb':status==='fail'?'Ausserhalb':status==='invalid'?'Min. > Max.':'Offen';
}
function renderExpectedRows(){
 const body=document.getElementById('expectedBody');
 if(!body)return;body.replaceChildren();
 for(const def of SensorBridgeCharacteristics.expectedDefinitions){
  const tr=document.createElement('tr');
  tr.dataset.key=def.key;
  makeTableCell(tr,def.label);
  const value=document.createElement('span');value.className='value current';
  const measured=makeTableCell(tr,value);const unit=document.createElement('span');unit.className='unit';unit.textContent=def.unit==='pressure'?state.pressureUnit:def.unit;measured.append(unit);
  for(const bound of ['min','max']){
   const input=makeNumberField(expectedLimits[def.key]?.[bound]??null,bound);
   input.dataset.key=def.key;
   makeTableCell(tr,input);
  }
  makeTableCell(tr,makeStatus(),'result');
  body.append(tr);
 }
 renderExpectedResults();
}
function renderExpectedResults(){
 const body=document.getElementById('expectedBody');if(!body)return;
 let pass=0,fail=0,invalid=0,set=0;
 for(const tr of body.rows){
  const def=SensorBridgeCharacteristics.expectedDefinitions.find(d=>d.key===tr.dataset.key);
  if(!def)continue;
  const actual=def.read(state);
  tr.querySelector('.current').textContent=Number(actual).toLocaleString('de-CH',{maximumFractionDigits:5});
  const result=SensorBridgeCharacteristics.checkLimits(actual,expectedLimits[def.key]);
  const pill=tr.querySelector('.status-pill');pill.className='status-pill '+result;pill.textContent=statusLabel(result);
  if(result!=='unset')set++;
  if(result==='pass')pass++;
  if(result==='fail')fail++;
  if(result==='invalid')invalid++;
 }
 const badge=document.getElementById('specResult');
 if(badge)badge.textContent=set?`${pass} innerhalb · ${fail} ausserhalb${invalid?' · '+invalid+' ungültig':''}`:'Noch keine Grenzen definiert';
}
function makeDirectionSelect(value){
 const sel=document.createElement('select');sel.dataset.field='direction';
 for(const [key,label] of [['up','↑ Aufwärts'],['down','↓ Abwärts']]){
  const o=document.createElement('option');o.value=key;o.textContent=label;sel.append(o);
 }sel.value=value;return sel;
}
function renderPointRows(){
 const body=document.getElementById('testPointsBody');
 if(!body)return;body.replaceChildren();
 document.getElementById('testPressureHeading').textContent='Druck ('+state.pressureUnit+')';
 for(const point of testPoints){
  const tr=document.createElement('tr');tr.dataset.id=String(point.id);
  const pressure=makeNumberField(Number(point.pressureValue.toPrecision(12)),'pressureValue','Druck');
  makeTableCell(tr,pressure);
  const percent=document.createElement('span');percent.className='pointPercent unit';makeTableCell(tr,percent);
  const temp=makeNumberField(point.temperature,'temperature','−40–125');
  temp.min='-40';temp.max='125';makeTableCell(tr,temp);
  makeTableCell(tr,makeDirectionSelect(point.direction));
  const out=document.createElement('span');out.className='value simulated';makeTableCell(tr,out);
  makeTableCell(tr,makeNumberField(point.min,'min'));
  makeTableCell(tr,makeNumberField(point.max,'max'));
  makeTableCell(tr,makeStatus());
  const del=document.createElement('button');del.type='button';del.className='mini';del.dataset.remove='true';del.textContent='Entfernen';del.title='Diesen Prüfpunkt entfernen';makeTableCell(tr,del);
  body.append(tr);
 }
 renderPointResults();
}
function renderPointResults(){
 const body=document.getElementById('testPointsBody');if(!body)return;
 for(const tr of body.rows){
  const point=testPoints.find(p=>p.id===Number(tr.dataset.id));if(!point)continue;
  const pct=PRESSURE.percent(point.pressureValue,state.pressureMin,state.pressureMax);
  point.pressure=pct; // keep legacy %FS field consistent with the physical value in profile exports
  tr.querySelector('.pointPercent').textContent=Number(pct).toLocaleString('de-CH',{maximumFractionDigits:2})+' %';
  const outside=pct<0||pct>100||point.temperature<state.temperatureMin||point.temperature>state.temperatureMax;
  const invalidRange=point.min!=null&&point.max!=null&&point.min>point.max;
  const output=tr.querySelector('.simulated');
  const pill=tr.querySelector('.status-pill');
  if(outside){
    output.textContent='—';pill.className='status-pill invalid';pill.textContent='Ausserhalb Bereich';
  }else{
    const result=model(state,pct,point.temperature,point.direction);
    output.textContent=Number(result.out).toLocaleString('de-CH',{minimumFractionDigits:4,maximumFractionDigits:5});
    const status=invalidRange?'invalid':SensorBridgeCharacteristics.checkLimits(result.out,point);
    pill.className='status-pill '+status;pill.textContent=statusLabel(status);
  }
 }
}
function initProfileUI(){
 renderExpectedRows();renderPointRows();
 document.getElementById('profileName').addEventListener('input',event=>{
  profileName=event.target.value.slice(0,100);
 });
 document.getElementById('expectedBody').addEventListener('input',event=>{
  const el=event.target;
  if(!el.matches('input[data-key]'))return;
  try{
   const key=el.dataset.key,bound=el.dataset.field;
   if(!expectedKeys.has(key)||!['min','max'].includes(bound))return;
   const value=parseOptionalBound(el.value);
   expectedLimits[key]={...expectedLimits[key],[bound]:value};
   renderExpectedResults();
  }catch(err){uiNotice('Ungültiger Grenzwert: '+err.message,'error');}
 });
 document.getElementById('testPointsBody').addEventListener('input',event=>{
  const input=event.target;
  const row=input.closest('tr[data-id]');if(!row)return;
  const point=testPoints.find(p=>p.id===Number(row.dataset.id));if(!point)return;
  const key=input.dataset.field;
  if(key==='direction')point.direction=input.value;
  else if(['pressureValue','temperature','min','max'].includes(key)){
   if(input.value.trim()==='' && ['min','max'].includes(key))point[key]=null;
   else {
    const n=Number(input.value);
    if(!Number.isFinite(n))return;
    if(key==='pressureValue'&&Math.abs(n*PRESSURE.units[state.pressureUnit].factor)>1e9)return;
    if(key==='temperature'&&(n< -40||n>125))return;
    point[key]=n;
   }
  }
  renderPointResults();
 });
 document.getElementById('testPointsBody').addEventListener('change',event=>{
  const select=event.target;
  if(!select.matches('select[data-field="direction"]'))return;
  const row=select.closest('tr[data-id]'),point=testPoints.find(p=>p.id===Number(row.dataset.id));
  if(point){point.direction=select.value;renderPointResults();}
 });
 document.getElementById('testPointsBody').addEventListener('click',event=>{
  const btn=event.target.closest('button[data-remove]');
  if(!btn)return;
  const id=Number(btn.closest('tr').dataset.id);
  testPoints=testPoints.filter(p=>p.id!==id);
  renderPointRows();
 });
 document.getElementById('addPointBtn').addEventListener('click',()=>{
  if(testPoints.length>=100){uiNotice('Maximal 100 Prüfpunkte unterstützt.','error');return;}
  testPoints.push({id:nextPointId++,pressure:state.pressure,pressureValue:state.pressureValue,temperature:state.temperature,direction:state.direction,min:null,max:null});
  renderPointRows();
  uiNotice('Prüfpunkt ergänzt. Optional min./max. Brückensignal eingeben.');
 });
 document.getElementById('resetPointsBtn').addEventListener('click',()=>{
  testPoints=SensorBridgeCharacteristics.defaultTestPoints().map(p=>({...p,pressureValue:PRESSURE.physical(p.pressure,state.pressureMin,state.pressureMax),id:nextPointId++}));
  renderPointRows();uiNotice('Standard-Prüfpunkte wiederhergestellt.');
 });
}
