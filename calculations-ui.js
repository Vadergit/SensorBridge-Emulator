'use strict';
/* Side-by-side general formulas and substituted values.
 * UI granularity and hypothetical AD5270 single-shunt resolution are separate.
 */
(function(root){
 const $=id=>document.getElementById(id);
 const core=root.SensorBridgeEquations;
 if(!core)return;
 const fmt=core.fmt, math=source=>'<math class="math-block" xmlns="http://www.w3.org/1998/Math/MathML">'+source+'</math>';
 const mi=x=>'<mi>'+x+'</mi>', mo=x=>'<mo>'+x+'</mo>',mn=x=>'<mn>'+x+'</mn>';
 const sub=(a,b)=>'<msub>'+mi(a)+mi(b)+'</msub>';
 const sup=(a,b)=>'<msup>'+mi(a)+mn(b)+'</msup>';
 const frac=(a,b)=>'<mfrac><mrow>'+a+'</mrow><mrow>'+b+'</mrow></mfrac>';
 const dot=mo('·');
 const pressureFormula=math(mi('p')+mo('=')+frac(mi('P')+mo('−')+sub('P','min'),sub('P','max')+mo('−')+sub('P','min')));
 const formulas=[
  ['dt','Temperaturdifferenz',math(mi('ΔT')+mo('=')+mi('T')+mo('−')+sub('T','ref'))],
  ['p','Normierter Hub',pressureFormula],
  ['nominalSpan','Nenn-Vollhub',math(sub('S','0')+mo('=')+mi('E')+dot+mi('S')+dot+mi('G'))],
  ['spanFactor','Temperaturfaktor',math(sub('k','T')+mo('=')+mn(1)+mo('+')+frac(mi('TKE')+dot+mi('ΔT')+mo('+')+sub('TKE','2')+dot+sup('ΔT','2'),sup('10','6')))],
  ['correctedSpan','Temperierter Vollhub',math(sub('S','T')+mo('=')+sub('S','0')+dot+sub('k','T'))],
  ['zero','Nullpunkt inkl. TK0/Drift',math(sub('V','0')+mo('=')+mi('O')+mo('+')+frac(mi('E')+dot+mo('(')+mi('TK0')+dot+mi('ΔT')+mo('+')+sub('TK0','2')+dot+sup('ΔT','2')+mo(')'),mn(1000))+mo('+')+frac(mi('D'),mn(1000)))],
  ['pressure','Lineares Drucksignal',math(sub('V','p')+mo('=')+sub('S','T')+dot+mi('p'))],
  ['nonlinearity','Nichtlinearität',math(sub('V','NL')+mo('=')+sub('S','T')+dot+frac(mi('NL'),mn(100))+dot+mn(4)+dot+mi('p')+dot+mo('(')+mn(1)+mo('−')+mi('p')+mo(')'))],
  ['hysteresis','Hysterese',math(sub('V','H')+mo('=')+sub('S','T')+dot+frac(mi('H'),mn(100))+dot+frac(mi('Richtung'),mn(2))+dot+mn(4)+dot+mi('p')+dot+mo('(')+mn(1)+mo('−')+mi('p')+mo(')'))],
  ['creep','Kriechen',math(sub('V','K')+mo('=')+sub('S','T')+dot+frac(mi('K'),mn(100))+dot+mi('p')+dot+mo('(')+mn(1)+mo('−')+mi('exp')+mo('(')+mo('−')+frac(mi('t'),mi('τ'))+mo(')')+mo(')'))],
  ['total','Differenzsignal gesamt',math(sub('V','out')+mo('=')+sub('V','0')+mo('+')+sub('V','p')+mo('+')+sub('V','NL')+mo('+')+sub('V','H')+mo('+')+sub('V','K'))]
 ];
 function number(v,d=5){return fmt(v,d);}
 function rowValues(s,z){
   const d=z.dt,p=z.p,ds=s.direction==='down'?'+1':'−1';
   const values={
    dt: number(s.temperature,3)+' − 25 = '+number(d,3)+' K',
    p:'('+number(s.pressureValue,5)+' − '+number(s.pressureMin,5)+') / ('+number(s.pressureMax,5)+' − '+number(s.pressureMin,5)+') = '+number(p,7)+' = '+number(p*100,4)+' % FS',
    nominalSpan:number(s.excitation,4)+' V × '+number(s.span,5)+' mV/V × '+number(s.bridgeGain,4)+' = '+number(z.nominalSpan,7)+' mV',
    spanFactor:'1 + ('+number(s.tke,4)+' × '+number(d,3)+' + '+number(s.tkeQuadratic,4)+' × '+number(d**2,3)+') / 10⁶ = '+number(z.spanFactor,9),
    correctedSpan:number(z.nominalSpan,6)+' mV × '+number(z.spanFactor,8)+' = '+number(z.correctedSpan,7)+' mV',
    zero:number(s.offset,6)+' + '+number(s.excitation,3)+' × ('+number(s.tk0,5)+' × '+number(d,3)+' + '+number(s.tk0Quadratic,5)+' × '+number(d*d,3)+') / 1000 + '+number(s.drift,4)+'/1000 = '+number(z.zero,7)+' mV',
    pressure:number(z.correctedSpan,7)+' × '+number(p,6)+' = '+number(z.pressure,7)+' mV',
    nonlinearity:number(z.correctedSpan,6)+' × ('+number(s.nonlinearity,5)+'/100) × 4 × '+number(p,5)+' × (1 − '+number(p,5)+') = '+number(z.nonlinearity,7)+' mV',
    hysteresis:number(z.correctedSpan,6)+' × ('+number(s.hysteresis,5)+'/100) × ('+ds+'/2) × 4 × '+number(p,5)+' × (1 − '+number(p,5)+') = '+number(z.hysteresis,7)+' mV',
    creep:number(z.correctedSpan,6)+' × ('+number(s.creepPercentFS,5)+'/100) × '+number(p,5)+' × (1 − exp(−'+number(s.elapsedSeconds,2)+'/'+number(s.creepTauS,2)+')) = '+number(z.creep,7)+' mV',
    total:number(z.zero,7)+' + '+number(z.pressure,7)+' + '+number(z.nonlinearity,7)+' + '+number(z.hysteresis,7)+' + '+number(z.creep,7)+' = '+number(z.total,7)+' mV'
   };
   return values;
 }
 function buildFormulaRows(){
   const box=$('calculationRows');box.replaceChildren();
   for(const [id,label,formula] of formulas){
     const item=document.createElement('div');item.className='calc-row';item.dataset.calc=id;
     const generic=document.createElement('div');generic.className='calc-formula';
     const title=document.createElement('strong');title.textContent=label;
     const formulaSpan=document.createElement('div');formulaSpan.className='calc-math';formulaSpan.innerHTML=formula;
     generic.append(title,formulaSpan);
     const numeric=document.createElement('div');numeric.className='calc-numeric';
     const caption=document.createElement('small');caption.textContent='Mit aktuellen Werten';
     const value=document.createElement('div');value.className='calc-current';value.dataset.calcValue=id;
     numeric.append(caption,value);
     item.append(generic,numeric);box.append(item);
   }
 }
 const display=document.createElement('div');
 function metric(label,value,detail){
   const col=document.createElement('div');col.className='resolution-metric';
   const a=document.createElement('small');a.textContent=label;
   const b=document.createElement('strong');b.textContent=value;
   const c=document.createElement('span');c.textContent=detail;
   col.append(a,b,c);return col;
 }
 function renderStages(s){
   const table=$('resolutionStages');table.replaceChildren();
   const stages=core.stageMetrics(s);
   for(const stage of stages){
     const row=document.createElement('tr');
     const columns=[
       stage.name,String(stage.count),fmt(stage.positions,0),
       fmt(stage.ohmPerCode,5)+' Ω',
       fmt(stage.minStepUv,5)+' µV',fmt(stage.maxStepUv,5)+' µV',
       fmt(stage.sweepSpanUv/1000,6)+' mV',
       fmt(stage.percentFsPerStepMin,6)+'–'+fmt(stage.percentFsPerStepMax,6)+' %'
     ];
     for(const col of columns){const cell=document.createElement('td');cell.textContent=col;row.append(cell);}
     table.append(row);
   }
   const fine=stages.find(x=>x.id==='fine');
   const gross=stages.find(x=>x.id==='coarse');
   $('resolutionExample').textContent=
    'Beispiel (bei aktuell '+fmt(s.excitation,3)+' V und '+fmt(s.bridgeResistance,0)+' Ω Brückenarmen): '+
    'Ein einzelner Feinabgleich-Kanal würde im idealen Modell über alle 1023 Codeübergänge '+
    fmt(fine.minStepUv,5)+' bis '+fmt(fine.maxStepUv,5)+' µV pro Schritt verändern. '+
    'Der Grobabgleich kann dagegen bis '+fmt(gross.maxStepUv,2)+' µV je Code springen. '+
    'Das ist keine reale Ausgangsauflösung: Bei acht gleichzeitig verschalteten Kanälen, '+
    'Leckströmen und späterer Regelung ist die Gesamtkennlinie noch unbekannt.';
   return stages;
 }
 function renderThermistor(s){
   const m=core.thermistorMetrics(s),box=$('thermistorResolution');box.replaceChildren();
   const row=document.createElement('div');row.className='resolution-metrics';
   row.append(
    metric('AD5270-20k Codes','1’024','0 bis 1’023, 1’023 Codeübergänge'),
    metric('R-Schritt ideal',fmt(20000/1024,5)+' Ω','Konstanter idealer Rheostat-Codeabstand'),
    metric('Netzwerk-R min.',fmt(5900,2)+' Ω','5’900 Ω + Code 0'),
    metric('Netzwerk-R max.',fmt(5900+20000*1023/1024,2)+' Ω','5’900 Ω + Code 1’023')
   );box.append(row);
   const paragraph=document.createElement('p');paragraph.className='hint';
   if(!m.active){
     paragraph.textContent='Temperaturwiderstand deaktiviert. Für theoretische Temperaturschritte wähle unter «Sensor definieren» PTC oder NTC. Ohne einen Widerstandskennwert kann keine temperaturbezogene Auflösung berechnet werden.';
   }else{
     paragraph.textContent=
       m.mode.toUpperCase()+' – Sollwiderstand bei '+fmt(s.temperature,2)+' °C: '+fmt(m.rTarget,3)+' Ω. '+
       (m.targetPossible
       ?'Idealer nächster Code '+m.currentIndex+' → '+fmt(m.quantizedR,3)+' Ω. Daraus folgt eine theoretische Temperaturabweichung von '+fmt(m.temperatureError,5)+' K.'
       :'Dieser Sollwiderstand liegt ausserhalb der angenommenen 5.9–25.9-kΩ-Widerstandsspanne und wäre mit diesem Konzept NICHT darstellbar.')+
       ' Im definierten Temperaturbereich '+fmt(s.temperatureMin,2)+' bis '+fmt(s.temperatureMax,2)+' °C liegen ideal '+
       fmt(m.representableCount,0)+' der 1’024 Codes. '+
       (m.coveredMin!=null?'Die nutzbare Modellspanne reicht dabei nur von '+fmt(m.coveredMin,3)+' bis '+fmt(m.coveredMax,3)+' °C. ':'')+
       (m.minTempStep!=null?'Benachbarte darstellbare Temperaturen unterscheiden sich um '+fmt(m.minTempStep,5)+' bis '+fmt(m.maxTempStep,5)+' K. ':'')+
       'Dies ist nur eine hypothetische Abbildung. Weder NTC noch PTC ist derzeit in der echten Firmware umgesetzt.';
   }
   box.append(paragraph);
 }
 function renderTolerance(s,stages){
   const fine=stages.find(x=>x.id==='fine');
   const proposed=window.SensorBridgeNumbers?.parse($('toleranceGoalUv').value);
   const box=$('toleranceGoalResult');
   if(proposed==null||proposed<=0){
     box.textContent='Bitte ein gültiges positives Toleranzziel in µV eingeben (Komma oder Punkt möglich).';
     return;
   }
   const idealWorst=fine.maxStepUv/2;
   box.textContent=
     'Ziel: ±'+fmt(proposed,5)+' µV. Ideales Rundungslimit am einzelnen Feinkanal '+
     '(ungünstigster Schritt / 2): ±'+fmt(idealWorst,6)+' µV. '+
     (idealWorst<=proposed
       ?'Die ideale Codequantisierung dieses EINZELNEN Kanals wäre kleiner als dein Toleranzziel.'
       :'Die ideale Codequantisierung dieses EINZELNEN Kanals wäre bereits grösser als dein Toleranzziel.')+
     ' Das ist kein Nachweis der Gesamtgenauigkeit: Analogabweichung, Wiper, Widerstandstoleranzen, '+
     'Rauschen, Temperaturdrift und Rückmessung sind noch offen. Die maximal erreichbare reale Toleranz ist unbekannt.';
 }
 function render(s,mainModel){
   if(!s||!$('calculationRows'))return;
   const z=core.calculate(s),numbers=rowValues(s,z);
   for(const [key,value] of Object.entries(numbers)){
     const cell=document.querySelector('[data-calc-value="'+key+'"]');
     if(cell)cell.textContent=value;
   }
   $('calcFinal').textContent=fmt(z.total,8)+' mV';
   $('calcReference').textContent=fmt(z.total/s.excitation,8)+' mV/V · '+fmt(s.pressure,4)+' % FS';
   const software=core.softwareMetrics(s),wrapper=$('resolutionSummaries');wrapper.replaceChildren();
   wrapper.append(
     metric('Druck-Slider',fmt(software.sliderPressure,3)+' % FS','Theoretisch '+fmt(software.pressurePositions,0)+' UI-Stellungen (0–100 %)'),
     metric('Temperatur-Slider',fmt(software.sliderTemp,3)+' °C','Theoretisch '+fmt(software.temperaturePositions,0)+' UI-Stellungen · ΔSignal '+fmt(software.temperatureEffectUv,6)+' µV je Schritt am aktuellen Druck'),
     metric('Druck-Schritt im Signal',fmt(software.pressureEffectUv,6)+' µV','Nur idealer linearer Hub, ohne die Nichtlinearität und Hysterese'),
     metric('AD5270 pro Kanal','1’024 Codes','10 Bit · hardwareseitige Auflösung erst nach Validierung')
   );
   const stages=renderStages(s);
   renderThermistor(s);
   renderTolerance(s,stages);
   if(mainModel&&Math.abs(mainModel.out-z.total)>1e-8){
     const warning=$('resolutionExample');
     warning.textContent+=' Hinweis: Formel- und Hauptmodell weichen ab. Bitte Kennlinienparameter prüfen.';
   }
 }
 buildFormulaRows();
 const goal=$('toleranceGoalUv');
 goal.addEventListener('change',()=>{
   if(window.SensorBridgeCurrentState)render(window.SensorBridgeCurrentState());
 });
 root.SensorBridgeEquationsUI=Object.freeze({render});
})(window);