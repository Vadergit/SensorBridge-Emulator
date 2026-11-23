'use strict';
// Clickable field-level help in the spirit of the ELMOS calibration assistant.
// One accessible dialog and a searchable, locally bundled Wiki.
(function(){
  const $=id=>document.getElementById(id);
  const articles=window.SensorBridgeWiki||[];
  const dict=new Map(articles.map(a=>[a.id,a]));
  const aliases={
    excitationNumber:'excitation',spanNumber:'span',offsetNumber:'offset',
    pressureNumber:'pressure',temperatureNumber:'temperature',
    pressureActualNumber:'pressureValue',
    setpointUnit:'pressureUnit',setpointMode:'setpointMode',
    baseSpan:'span',effectiveSpan:'bridgeGain',zero:'zero',
    bridgeResistance:'bridgeResistance'
  };
  const lookup=id=>dict.get(aliases[id]||id);
  let active=null,category='Alle';

  function helpButton(key){
    const article=lookup(key);
    if(!article)return null;
    const button=document.createElement('button');
    button.type='button';
    button.className='help-trigger';
    button.dataset.help=article.id;
    button.textContent='?';
    button.setAttribute('aria-label','Hilfe: '+article.title);
    button.title=article.title+' – Erklärung öffnen';
    return button;
  }
  function attachInputs(){
    const ids=new Set(articles.map(a=>a.id));
    for(const item of document.querySelectorAll('input[id],select[id]')){
      const entry=lookup(item.id);
      if(!entry)continue;
      let label=item.closest('label')||document.querySelector('label[for="'+item.id+'"]');
      if(!label)continue;
      // An associated label can include two linked fields; add only once.
      if(label.querySelector(':scope > .help-trigger'))continue;
      const btn=helpButton(entry.id);
      if(btn)label.append(btn);
    }
    const headingTopics={
      'Physikalischer Messbereich':'percent',
      'Druckmessbereich':'percent',
      'Temperaturwiderstand':'tempResistorMode',
      'Brückenmodell':'bridgeResistance',
      'Kennlinie':'nonlinearity',
      'Sensordaten':'emulator',
      'Druck und Temperatur einstellen':'setpointMode',
      'Gerätekommunikation':'ble',
      'Sensorparameter':'emulator',
      'Aktuelles Sensorprofil':'profiles',
      'Gespeicherte Profile':'profiles',
      'ESP32-C3 SuperMini aktualisieren':'firmware'
    };
    for(const heading of document.querySelectorAll('.panel h2,.section-head h2')){
      const key=headingTopics[heading.textContent.trim()];
      if(!key||heading.querySelector('.help-trigger'))continue;
      const btn=helpButton(key);if(btn)heading.append(btn);
    }
  }
  function attachExpected(){
    const body=$('expectedBody');
    if(!body)return;
    for(const row of body.querySelectorAll('tr[data-key]')){
      if(row.querySelector('.help-trigger'))continue;
      const key=row.dataset.key,btn=helpButton(key);
      if(btn){
        const first=row.querySelector('td');
        if(first){first.classList.add('wiki-cell');first.append(btn);}
      }
    }
  }

  function close(){if($('helpDialog').open)$('helpDialog').close();}
  function openHelp(id){
    const a=lookup(id);
    if(!a)return;
    active=a;
    $('helpDialogTitle').textContent=a.title;
    $('helpDialogDescription').textContent=a.description;
    $('helpDialogExample').textContent='Beispiel: '+a.example;
    const modal=$('helpDialog');
    if(modal.open)modal.close();
    modal.showModal();
  }
  $('helpDialogClose').addEventListener('click',close);
  $('helpDialogDone').addEventListener('click',close);
  $('helpDialog').addEventListener('click',event=>{
    if(event.target===$('helpDialog'))close();
  });
  $('helpDialogWiki').addEventListener('click',()=>{
    const subject=active;
    close();
    window.SensorBridgeWorkspace?.choose('wiki');
    if(subject){$('wikiSearch').value=subject.title;category='Alle';render();}
  });
  document.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-help]');
    if(!btn)return;
    event.preventDefault();event.stopPropagation();
    openHelp(btn.dataset.help);
  },true);

  function renderCategories(){
    const categories=['Alle',...new Set(articles.map(a=>a.category))];
    const box=$('wikiCategories');
    box.replaceChildren();
    for(const name of categories){
      const button=document.createElement('button');
      button.type='button';button.className='wiki-category';
      if(name===category)button.classList.add('selected');
      button.textContent=name;
      button.setAttribute('aria-pressed',String(name===category));
      button.addEventListener('click',()=>{category=name;render();});
      box.append(button);
    }
  }
  function render(){
    renderCategories();
    const query=$('wikiSearch').value.trim().toLocaleLowerCase('de-CH');
    const matches=articles.filter(a=>(category==='Alle'||a.category===category)&&
      (!query||[a.title,a.description,a.example,a.category,a.id].join(' ').toLocaleLowerCase('de-CH').includes(query)));
    $('wikiCount').textContent=matches.length+' Begriff'+(matches.length===1?'':'e')+' gefunden';
    const box=$('wikiArticles');box.replaceChildren();
    for(const item of matches){
      const article=document.createElement('details');
      article.className='wiki-entry';
      if(matches.length===1)article.open=true;
      const summary=document.createElement('summary');
      const category=document.createElement('span');category.className='wiki-entry-category';category.textContent=item.category;
      const title=document.createElement('span');title.textContent=item.title;
      summary.append(title,category);
      const desc=document.createElement('p');desc.textContent=item.description;
      const example=document.createElement('p');example.className='wiki-example';example.textContent='Beispiel: '+item.example;
      article.append(summary,desc,example);box.append(article);
    }
    if(!matches.length){const p=document.createElement('p');p.className='empty-state';p.textContent='Keine Treffer. Versuche eine Abkürzung wie TK0 oder einen allgemeineren Begriff.';box.append(p);}
  }
  $('wikiSearch').addEventListener('input',render);
  attachInputs();attachExpected();
  // The expected-limits table is dynamically regenerated after profile and unit
  // changes, so attach its question-mark controls again when rows change.
  const expected=$('expectedBody');
  if(expected){
    const observer=new MutationObserver(()=>attachExpected());
    observer.observe(expected,{childList:true,subtree:false});
  }
  render();
  window.SensorBridgeHelp=Object.freeze({open:openHelp,find:lookup});
})();