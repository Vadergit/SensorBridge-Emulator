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
 const temperatureSteps=[];
 for(let k=1;k<legal.length;k++){
  // Only consecutive codes are a real adjacent step.
  if(legal[k].code===legal[k-1].code+1)temperatureSteps.push(Math.abs(legal[k].temp-legal[k-1].temp));
 }
 return {mode,active:true,series,pot,positions:N,codeIntervalOhms:pot/N,
  possibleMin,possibleMax,rTarget,targetPossible,currentIndex,quantizedR,actualTemp,
  temperatureError:actualTemp==null?null:actualTemp-s.temperature,
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
root.SensorBridgeEquations=Object.freeze({
 calculate,shuntOutputMv,stageMetrics,thermistorMetrics,softwareMetrics,fmt,STAGES,
 positionsPerAD5270:N
});
})(window);