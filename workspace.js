'use strict';
// Workspace organisation and local profile management.
// Functions referencing SensorBridgeProfileAPI are called only after app.js loads.
(function(){
  const $=id=>document.getElementById(id);
  const relocate=(selector,container)=>{
    const element=document.querySelector(selector),destination=$(container);
    if(element&&destination)destination.append(element);
  };
  // Move only the setpoint controls into Emulation; the electrical sensor
  // definition remains grouped in the Sensor workspace.
  relocate('.physical-current','emulatorSetpoints');
  relocate('#parameterFields .field[data-field="pressure"]','emulatorSetpoints');
  relocate('#parameterFields .field[data-field="temperature"]','emulatorSetpoints');
  relocate('.controls > .quick','emulatorSetpoints');
  const controlPanel=document.querySelector('.controls');
  const hardwareHead=Array.from(controlPanel?.querySelectorAll('.section-head')||[])
    .find(el=>el.querySelector('h2')?.textContent?.trim()==='Hardware');
  if(hardwareHead){
    const hint=hardwareHead.nextElementSibling;
    const actions=hint?.nextElementSibling;
    $('emulatorHardware').append(hardwareHead);
    if(hint&&hint.classList.contains('hint'))$('emulatorHardware').append(hint);
    if(actions&&actions.classList.contains('action-row'))$('emulatorHardware').append(actions);
  }
  relocate('.specifications .spec-top','profileConfig');

  function choose(view){
    const target=$( 'view-'+view );
    if(!target)return;
    for(const item of document.querySelectorAll('.view')){
      const visible=item===target;
      item.classList.toggle('active-view',visible);
      item.setAttribute('aria-hidden',String(!visible));
    }
    for(const button of document.querySelectorAll('[data-view]')){
      const selected=button.dataset.view===view;
      button.classList.toggle('active',selected);
      if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    }
    $('pageTitle').textContent=target.dataset.pageTitle||'SensorBridge';
    $('sidebar').classList.remove('open');
    if(location.hash!=='#'+view)history.replaceState(null,'','#'+view);
    window.scrollTo({top:0,behavior:'instant'});
    updateOverview();
  }
  for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>choose(button.dataset.view));
  for(const button of document.querySelectorAll('[data-goto]'))button.addEventListener('click',()=>choose(button.dataset.goto));
  window.addEventListener('hashchange',()=>choose(location.hash.slice(1)));
  $('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  choose(location.hash.slice(1)||'dashboard');

  function setTheme(theme){
    const mode=theme==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;
    document.documentElement.dataset.theme=mode;
    $('themeSelect').value=theme;
    $('quickThemeBtn').title='Zu '+(mode==='dark'?'hellem':'dunklem')+' Design wechseln';
    try{localStorage.setItem('sensorbridge-theme-v1',theme);}catch(e){}
  }
  function themeChoice(){
    try{return localStorage.getItem('sensorbridge-theme-v1')||'light';}catch(e){return 'light';}
  }
  $('themeSelect').addEventListener('change',event=>setTheme(event.target.value));
  $('quickThemeBtn').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(themeChoice()==='system')setTheme('system')});
  setTheme(themeChoice());

  const physical=$('pressureActual').closest('.physical-current');
  const percent=$('pressure').closest('.field');
  function modeUpdate(){
    const usePercent=$('setpointMode').value==='percent';
    physical.hidden=usePercent;
    percent.hidden=!usePercent;
    $('setpointUnit').disabled=usePercent;
    $('setpointUnit').value=$('pressureUnit').value;
  }
  $('setpointMode').addEventListener('change',modeUpdate);
  $('setpointUnit').addEventListener('change',event=>{
    $('pressureUnit').value=event.target.value;
    $('pressureUnit').dispatchEvent(new Event('change',{bubbles:true}));
    modeUpdate();
  });
  $('pressureUnit').addEventListener('change',()=>{$('setpointUnit').value=$('pressureUnit').value;});
  modeUpdate();

  function updateOverview(){
    const output=$('outMv')?.textContent?.trim()||'–';
    const pressure=$('physicalPressureMetric')?.textContent?.trim()||'–';
    const temperature=$('temperatureMetric')?.textContent?.trim()||'–';
    $('overviewName').textContent=$('profileName')?.value||'Neues Sensorprofil';
    $('overviewPressure').textContent=pressure;
    $('overviewTemperature').textContent=temperature;
    $('overviewSignal').textContent=output;
    $('emulatorPercent').textContent=($('pressureNumber')?.value||'–')+' %';
    $('emulatorPhysical').textContent=pressure;
    $('emulatorSignal').textContent=output;
    $('sidebarDevice').textContent=$('connectionBadge')?.textContent?.includes('Verbunden')?'BLE verbunden':'Offline · Demo-Modus';
  }
  window.SensorBridgeWorkspace=Object.freeze({updateOverview,choose,modeUpdate});
  // Main app's input handlers modify state synchronously; refresh lightweight
  // readouts in a microtask after their own handlers have completed.
  document.addEventListener('input',()=>queueMicrotask(updateOverview));
  document.addEventListener('change',()=>queueMicrotask(()=>{modeUpdate();updateOverview();}));
  const observer=new MutationObserver(()=>updateOverview());
  observer.observe($('outMv'),{childList:true,characterData:true,subtree:true});
  observer.observe($('connectionBadge'),{childList:true,characterData:true,subtree:true});
  queueMicrotask(updateOverview);

  const STORAGE='sensorbridge-local-profiles-v1';
  function readSaved(){
    try{const value=JSON.parse(localStorage.getItem(STORAGE)||'[]');
      return Array.isArray(value)?value.filter(x=>x&&typeof x.name==='string'&&x.payload).slice(0,40):[];
    }catch(err){return [];}
  }
  function writeSaved(data){
    try{localStorage.setItem(STORAGE,JSON.stringify(data.slice(0,40)));return true;}catch(err){alert('Speichern im Browser nicht möglich: '+err.message);return false;}
  }
  function profileList(){
    const box=$('storedProfiles');box.replaceChildren();
    const saved=readSaved();
    if(!saved.length){const p=document.createElement('p');p.className='empty-state';p.textContent='Noch keine lokalen Profile vorhanden. Du kannst das aktuelle Sensorprofil hier speichern.';box.append(p);return;}
    saved.forEach((item,index)=>{
      const row=document.createElement('div');row.className='profile-row';
      const text=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name;
      const date=document.createElement('small');date.textContent='Gespeichert: '+new Date(item.savedAt).toLocaleString('de-CH');date.style.display='block';text.append(name,date);
      const actions=document.createElement('div');actions.className='actions';
      const load=document.createElement('button');load.type='button';load.textContent='Laden';
      load.addEventListener('click',()=>{
        try{window.SensorBridgeProfileAPI.load(item.payload);
          choose('emulator');window.SensorBridgeWorkspace.modeUpdate();
        }catch(err){alert('Profil konnte nicht geladen werden: '+err.message);}
      });
      const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Löschen';
      remove.addEventListener('click',()=>{if(confirm('Profil "'+item.name+'" löschen?')){const data=readSaved();data.splice(index,1);writeSaved(data);profileList();}});
      actions.append(load,remove);row.append(text,actions);box.append(row);
    });
  }
  $('storeProfileBtn').addEventListener('click',()=>{
    const api=window.SensorBridgeProfileAPI;if(!api){alert('Die Profilverwaltung ist noch nicht bereit.');return;}
    const payload=api.snapshot(),name=payload.name?.trim()||'Sensorprofil';
    const data=readSaved(),id=Date.now().toString(36);
    data.unshift({id,name,savedAt:new Date().toISOString(),payload});
    if(writeSaved(data)){profileList();$('notice').textContent='Profil "'+name+'" lokal gespeichert.';}
  });
  $('clearLocalProfilesBtn').addEventListener('click',()=>{
    if(confirm('Alle lokal gespeicherten Sensorprofile in diesem Browser löschen?')){writeSaved([]);profileList();}
  });
  profileList();
})();