/* Transparent mathematical calculations for SensorBridge.
 * All candidate AD5270 calculations are IDEALISED, one-arm only, and
 * must NOT be used as real achievable output/tolerance claims.
 */
(function(root){
'use strict';
const N=1024, R_POT=100000, R_POT_PTC=20000;
const STAGES=Object.freeze([
 {id:'coarse',name:'Grobabgleich',count:4,series:12000,rpot:R_POT},
 {id:'middle',name:'Mittelabgleich',count:2,series:150000,rpot:R_POT},
 {id:'fine',name:'Feinabgleich',count:2,series:4530000,rpot:R_POT}
]);
const fmt=(v,d=5)=>{
 if(!Number.isFinite(v))return '—';
 if(Math.abs(v)>0&&Math.abs(v)<0.00001)return v.toExponential(4);
 return new Intl.NumberFormat('de-CH',{maximumFractionDigits:d}).format(v);
};
function calculate(s){
 const e=s.excitation, p=s.pressure/100, dt=s.temperature-25, temperature=s.temperature;
 const nominalSpan=e*s.span*s.bridgeGain;
 const spanFactor=1+(s.tke*dt+s.tkeQuadratic*dt**2)/1e6;
 const correctedSpan=nominalSpan*spanFactor;
 const offsetTemp=e*(s.tk0*dt+s.tk0Quadratic*dt**2)/1000;
 const nonlinearity=correctedSpan*s.nonlinearity/100*4*p*(1-p);
 const sign=s.direction==='down'?1:-1;
 const hysteresis=correctedSpan*s.hysteresis/100*(sign/2)*4*p*(1-p);
 const creep=correctedSpan*s.creepPercentFS/100*p*(1-Math.exp(-s.elapsedSeconds/s.creepTauS));
 const zero=s.offset+offsetTemp+s.drift/1000;
 const pressure=correctedSpan*p;
 const total=zero+pressure+nonlinearity+hysteresis+creep;
 return {e,p,dt,temperature,nominalSpan,spanFactor,correctedSpan,offsetTemp,nonlinearity,hysteresis,creep,zero,pressure,total,sign};
}
function shuntOutputMv(e,rArm,rSeries,rPot,code){
 // One ideal shunt across R1 of a balanced 4-arm Wheatstone bridge.
 // Digital resistor R(D) = code * Rpot / 1024: wiper resistance,
 // terminal leakage, code transfer errors and all manufacturing
 // tolerances intentionally omitted.
 const rheostat=rPot*code/N;
 const shunt=rSeries+rheostat;
 const effective=1/(1/rArm+1/shunt);
 return 1000*e*(rArm/(rArm+effective)-0.5);
}
function stageMetrics(s){
 return STAGES.map(stage=>{
  let min=Infinity,max=-Infinity,sum=0;
  let first=shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,0);
  let last=first,local=[];
  for(let code=1;code<N;code++){
   const current=shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,code);
   const diff=Math.abs(current-last)*1000; // µV, one AD5270 code
   local.push(diff);min=Math.min(min,diff);max=Math.max(max,diff);sum+=diff;
   last=current;
  }
  const midIndex=512;
  const midStep=Math.abs(shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,midIndex+1)
    -shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,midIndex))*1000;
  const span=Math.abs(last-first)*1000;
  const fsMilliVolt=s.excitation*s.span*s.bridgeGain;
  return {...stage,positions:N,codeIntervals:N-1,
   ohmPerCode:stage.rpot/N,minStepUv:min,maxStepUv:max,midStepUv:midStep,
   averageStepUv:sum/(N-1),sweepSpanUv:span,
   percentFsPerStepMin:min/(fsMilliVolt*1000)*100,
   percentFsPerStepMax:max/(fsMilliVolt*1000)*100,
   quantizationOptimisticUv:midStep/2, reference:'Single R1 shunt, others unchanged'};
 });
}
function thermistorMetrics(s){
 const mode=s.tempResistorMode||'off';
 if(mode==='off')return {mode,active:false,reason:'Temperaturwiderstand deaktiviert'};
 const series=5900,pot=R_POT_PTC,possibleMin=series,possibleMax=series+pot*(N-1)/N;
 const rTarget=mode==='ntc'
   ?s.ntcR25*Math.exp(s.ntcBeta*(1/(s.temperature+273.15)-1/298.15))
   :s.ptcR25*(1+s.ptcPpm*(s.temperature-25)/1e6);
 const targetPossible=Number.isFinite(rTarget)&&rTarget>=possibleMin&&rTarget<=possibleMax;
 const solveTemperature=r=>{
  if(mode==='ptc'){
   if(s.ptcPpm===0)return NaN;
   return 25+(r/s.ptcR25-1)*1e6/s.ptcPpm;
  }
  if(r<=0||s.ntcR25<=0||s.ntcBeta<=0)return NaN;
  const denominator=1/298.15+Math.log(r/s.ntcR25)/s.ntcBeta;
  return denominator>0?1/denominator-273.15:NaN;
 };
 const legal=[];
 for(let code=0;code<N;code++){
   const r=series+pot*code/N;
   const temp=solveTemperature(r);
   if(Number.isFinite(temp)&&temp>=s.temperatureMin&&temp<=s.temperatureMax)legal.push({code,temp,r});
 }
 const temps=legal.map(x=>x.temp);
 const currentIndex=targetPossible
   ?Math.max(0,Math.min(N-1,Math.round((rTarget-series)*N/pot)))
   :null;
 const quantizedR=currentIndex==null?null:series+pot*currentIndex/N;
 const actualTemp=quantizedR==null?null:solveTemperature(quantizedR);
 let localTempStep=null;
 if(currentIndex!=null){
   const localR=series+pot*currentIndex/N;
   const candidates=[];
   for(const neighbor of [currentIndex-1,currentIndex+1]){
     if(neighbor<0||neighbor>=N)continue;
     const neighborTemp=solveTemperature(series+pot*neighbor/N);
     const localTemp=solveTemperature(localR);
     if(Number.isFinite(localTemp)&&Number.isFinite(neighborTemp) &&
        localTemp>=s.temperatureMin&&localTemp<=s.temperatureMax &&
        neighborTemp>=s.temperatureMin&&neighborTemp<=s.temperatureMax){
       candidates.push(Math.abs(localTemp-neighborTemp));
     }
   }
   if(candidates.length)localTempStep=Math.min(...candidates);
 }
 const temperatureSteps=[];
 for(let k=1;k<legal.length;k++){
  // Only consecutive codes are a real adjacent step.
  if(legal[k].code===legal[k-1].code+1)temperatureSteps.push(Math.abs(legal[k].temp-legal[k-1].temp));
 }
 return {mode,active:true,series,pot,positions:N,codeIntervalOhms:pot/N,
  possibleMin,possibleMax,rTarget,targetPossible,currentIndex,quantizedR,actualTemp,
  temperatureError:actualTemp==null?null:actualTemp-s.temperature,
  localTempStep,
  representableCount:legal.length,
  coveredMin:temps.length?Math.min(...temps):null,
  coveredMax:temps.length?Math.max(...temps):null,
  minTempStep:temperatureSteps.length?Math.min(...temperatureSteps):null,
  maxTempStep:temperatureSteps.length?Math.max(...temperatureSteps):null,
  // Purely ideal simulated mapping. No real NTC/PTC implementation exists.
  caveat:'Hypothetische Ein-Kanal-Realisierung des 5.9-kΩ-Serienzweigs; kein aktiver Hardwareausgang'
 };
}
function softwareMetrics(s){
 const sliderPressure=0.001; // index.html input step
 const sliderTemp=0.001;
 const baseSpan=s.excitation*s.span*s.bridgeGain;
 const pressureEffectUv=s.excitation*s.span*s.bridgeGain*1000*sliderPressure/100;
 const tempRange=s.temperatureMax-s.temperatureMin;
 const fraction=s.pressure/100;
 const dt=1e-3;
 const a=calculate(s).total;
 const adjacent=calculate({...s,temperature:Math.min(s.temperatureMax,s.temperature+dt)}).total;
 return {sliderPressure,sliderTemp,pressurePositions:Math.round(100/sliderPressure)+1,
  temperaturePositions:Math.round(tempRange/sliderTemp)+1,
  pressureEffectUv,temperatureEffectUv:(adjacent-a)*1000,
  trueAnalogueQuantizationKnown:false,
  outputToleranceUv:null,
  outputNoiseUv:null,
  reachablePressurePositions:null};
}
/**
 * A clearly hypothetical %FS grid demonstration.
 *
 * There is NO combined 8-channel network map yet. Treating the nearest isolated
 * fine-channel 512 -> 513 increment as a globally repeated uniform step is an
 * illustrative rounding exercise, NOT a reachable output claim.
 * Single channel step range and percentage conversion are separately reported.
 */
function hubPrecision(s){
 const targetPercent=s.pressure;
 const signalAt=p=>calculate({...s,pressure:p}).total;
 const targetMv=signalAt(targetPercent);
 const baselineMv=signalAt(0);
 const fullMv=signalAt(100)-baselineMv;
 const pLo=Math.max(0,targetPercent-0.01),pHi=Math.min(100,targetPercent+0.01);
 const localSlopeUvPerPercent=pHi>pLo?
   (signalAt(pHi)-signalAt(pLo))*1000/(pHi-pLo):NaN;
 const stages=stageMetrics(s).map(stage=>{
   const oneCodeMv=Math.abs(
      shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,513)-
      shuntOutputMv(s.excitation,s.bridgeResistance,stage.series,stage.rpot,512));
   const oneStepUv=oneCodeMv*1000;
   const slopeAbs=Math.abs(localSlopeUvPerPercent);
   return {...stage,oneStepUv,
     localStepPercent:slopeAbs>1e-12?oneStepUv/slopeAbs:null,
     localMinPercent:slopeAbs>1e-12?stage.minStepUv/slopeAbs:null,
     localMaxPercent:slopeAbs>1e-12?stage.maxStepUv/slopeAbs:null,
     isolatedCoveragePercent:slopeAbs>1e-12?stage.sweepSpanUv/slopeAbs:null};
 });
 const fine=stages.find(stage=>stage.id==='fine');
 const valid=Number.isFinite(targetMv)&&Number.isFinite(localSlopeUvPerPercent)&&
   localSlopeUvPerPercent>1e-12&&fullMv>0&&
   Number.isFinite(fine.oneStepUv)&&fine.oneStepUv>0;
 let gridPercent=null,gridDeviationPercent=null,gridOutputMv=null;
 if(valid){
   // Constant-voltage fictitious grid, anchored to zero-pressure model output.
   // It assumes a perfectly accurate coarse/middle positioning stage and one
   // endlessly repeated local fine step, which real hardware does not provide.
   const gridMv=fine.oneStepUv/1000;
   const discreteCode=Math.round((targetMv-baselineMv)/gridMv);
   gridOutputMv=baselineMv+discreteCode*gridMv;
   const lowOutput=signalAt(0),highOutput=signalAt(100);
   gridOutputMv=Math.min(highOutput,Math.max(lowOutput,gridOutputMv));
   // Search only if whole pressure curve is monotonic. This can fail for
   // intentionally extreme nonlinearity / hysteresis simulation settings.
   let monotonic=true,previous=lowOutput;
   for(let p=1;p<=100;p+=1){
     const next=signalAt(p);
     if(next<=previous){monotonic=false;break;}
     previous=next;
   }
   if(monotonic){
     let low=0,high=100;
     for(let i=0;i<45;i++){
       const mid=(low+high)/2;
       if(signalAt(mid)<gridOutputMv)low=mid;else high=mid;
     }
     gridPercent=(low+high)/2;
     gridDeviationPercent=gridPercent-targetPercent;
   }
 }
 return {
   targetPercent,targetMv,localSlopeUvPerPercent,
   nominalFullScaleMv:fullMv,stages,fine,
   idealLocalPercentStep:valid?fine.localStepPercent:null,
   idealRoundingLimitPercent:valid?fine.localStepPercent/2:null,
   gridPercent,gridDeviationPercent,gridOutputMv,
   actualReachedPercent:null,actualAccuracyPercent:null,
   hardwareVerified:false,
   caveat:'Nur eine idealisierte Rundung mit einem gleichmässig wiederholten Feinschritt, keine real verifizierte Hubauflösung. Die Grob-/Mittelpositionierung, kombinierte Netlist, Leckströme, Rauschen und Rückmessung fehlen.'
 };
}
/**
 * Sensor-parameter-oriented resolution.
 * These are UI control increments, not achievable hardware increments.
 * Candidate ADC/AD5270 theoretical figures are explicitly separated.
 */
function parameterResolution(s){
 const pressureStep=0.001,temperatureStep=0.001,offsetStep=0.001;
 const gainStep=0.001,spanStep=0.001;
 const output=calculate(s).total;
 function delta(key,step,min,max){
   const before=s[key];
   if(!Number.isFinite(before))return null;
   const after=before+step<=max?before+step:
     before-step>=min?before-step:null;
   if(after===null)return null;
   const changed=calculate({...s,[key]:after}).total;
   return Number.isFinite(changed)?(changed-output)*1000:null; // µV
 }
 function absOrNull(value){return Number.isFinite(value)?Math.abs(value):null;}
 function fullSpanDelta(key,step,min,max){
   const current=s[key];
   const proposed=current+step<=max?current+step:current-step>=min?current-step:null;
   if(proposed===null)return null;
   const span=x=>calculate({...s,...x,pressure:100}).total-calculate({...s,...x,pressure:0}).total;
   return Math.abs(span({[key]:proposed})-span({}))*1000;
 }
 const hub=hubPrecision(s);
 const therm=thermistorMetrics(s);
 const zero=calculate({...s,pressure:0}).total;
 const full=calculate({...s,pressure:100}).total-zero;
 const slope=hub.localSlopeUvPerPercent;
 const referenceHub=hub.idealLocalPercentStep;
 const temperatureModelStep=therm.active && therm.targetPossible &&
   Number.isFinite(therm.actualTemp) ? Math.abs(therm.temperatureError) : null;
 const rows=[
   {id:'pressure',name:'Hub / Druck',setpoint:s.pressure,unit:'% FS',
    uiStep:pressureStep,uiUnit:'% FS',deltaUv:absOrNull(delta('pressure',pressureStep,0,100)),
    hardware:'Offen',reference:referenceHub,
    referenceUnit:'% FS'},
   {id:'temperature',name:'Temperatur',setpoint:s.temperature,unit:'°C',
    uiStep:temperatureStep,uiUnit:'°C',
    deltaUv:absOrNull(delta('temperature',temperatureStep,s.temperatureMin,s.temperatureMax)),
    hardware:'Offen',reference:therm.active&&therm.targetPossible?therm.minTempStep:null,
    referenceUnit:'°C'},
   {id:'offset',name:'Nullpunktversatz',setpoint:s.offset,unit:'mV',
    uiStep:offsetStep,uiUnit:'mV',deltaUv:absOrNull(delta('offset',offsetStep,-1000,1000)),
    hardware:'Offen',reference:null,referenceUnit:null},
   {id:'gain',name:'Brücken-Gain',setpoint:s.bridgeGain,unit:'×',
    uiStep:gainStep,uiUnit:'×',deltaUv:absOrNull(delta('bridgeGain',gainStep,0.01,10)),
    hardware:'Offen',fullSpanDeltaUv:fullSpanDelta('bridgeGain',gainStep,0.01,10),reference:null,referenceUnit:null},
   {id:'span',name:'Signalspanne',setpoint:s.span,unit:'mV/V',
    uiStep:spanStep,uiUnit:'mV/V',deltaUv:absOrNull(delta('span',spanStep,1,4)),
    hardware:'Offen',fullSpanDeltaUv:fullSpanDelta('span',spanStep,1,4),reference:null,referenceUnit:null}
 ];
 return {rows,outputMv:output,zeroMv:zero,fullSpanMv:full,
   hubTarget:s.pressure,temperatureTarget:s.temperature,
   thermistor:therm,temperatureModelStep,
   hubIdealReferenceStep:referenceHub,
   hubReferenceMin:hub.fine.localMinPercent,
   hubReferenceMax:hub.fine.localMaxPercent,
   hubActualReached:null,temperatureActualReached:null,
   hardwareVerified:false,
   warning:'Keine tatsächlichen Sensorausgangs-Stellschritte ableitbar: Schaltplan, kombinierte 8-Kanal-Kennlinie und Rückmessung fehlen. UI-Stellraster und isolierte Rechenreferenz sind keine garantierte Hardwareauflösung.'
 };
}
root.SensorBridgeEquations=Object.freeze({
 calculate,hubPrecision,parameterResolution,shuntOutputMv,stageMetrics,thermistorMetrics,softwareMetrics,fmt,STAGES,
 positionsPerAD5270:N
});
})(window);