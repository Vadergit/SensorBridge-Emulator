/* SensorBridge mathematical reference model.
 * No AD5270 transfer model, DAC resolution/noise, or real analogue output.
 * Browser-global export supports a later integration into SSC calibration tools.
 */
(function(root){
'use strict';
const extraDefaults=Object.freeze({
  bridgeGain:1, bridgeResistance:10000, direction:'up',
  hysteresis:0, tk0Quadratic:0, tkeQuadratic:0,
  creepPercentFS:0, creepTauS:60, elapsedSeconds:0,
  pressureMin:0, pressureMax:10, pressureValue:5, pressureUnit:'bar', pressureReference:'gauge',
  temperatureMin:-40, temperatureMax:125
});
const extraRanges=Object.freeze({
  bridgeGain:[0.01,10], bridgeResistance:[100,1000000],
  hysteresis:[0,20], tk0Quadratic:[-100,100],
  tkeQuadratic:[-10000,10000], creepPercentFS:[-20,20],
  creepTauS:[0.1,3600], elapsedSeconds:[0,3600]
});
const expectedDefinitions=Object.freeze([
  {key:'baseSpan',label:'Brückenspanne nominal',unit:'mV/V',read:s=>s.span},
  {key:'effectiveSpan',label:'Brückenspanne inkl. Gain',unit:'mV/V',read:s=>s.span*s.bridgeGain},
  {key:'bridgeGain',label:'Brücken-Gain',unit:'×',read:s=>s.bridgeGain},
  {key:'zero',label:'Nullpunkt bei 25 °C',unit:'mV/V',read:s=>s.offset/s.excitation+s.drift/(s.excitation*1000)},
  {key:'tk0',label:'TK0',unit:'µV/V/K',read:s=>s.tk0},
  {key:'tke',label:'TKE',unit:'ppm/K',read:s=>s.tke},
  {key:'tk0Quadratic',label:'TK0-Krümmung',unit:'µV/V/K²',read:s=>s.tk0Quadratic},
  {key:'tkeQuadratic',label:'TKE-Krümmung',unit:'ppm/K²',read:s=>s.tkeQuadratic},
  {key:'hysteresis',label:'Hysterese max.',unit:'% FS',read:s=>s.hysteresis},
  {key:'nonlinearity',label:'Nichtlinearität max.',unit:'% FS',read:s=>Math.abs(s.nonlinearity)},
  {key:'creepPercentFS',label:'Kriechen',unit:'% FS',read:s=>s.creepPercentFS},
  {key:'drift',label:'Offsetdrift',unit:'µV',read:s=>s.drift},
  {key:'bridgeResistance',label:'Brückeneingangswiderstand',unit:'Ω',read:s=>s.bridgeResistance},
  {key:'pressureValue',label:'Aktueller Druck',unit:'pressure',read:s=>s.pressureValue},
  {key:'pressureMin',label:'Druckmessbereich Beginn',unit:'pressure',read:s=>s.pressureMin},
  {key:'pressureMax',label:'Druckmessbereich Ende',unit:'pressure',read:s=>s.pressureMax},
  {key:'pressure',label:'Aktueller Hub',unit:'%',read:s=>s.pressure},
  {key:'temperature',label:'Aktuelle Temperatur',unit:'°C',read:s=>s.temperature},
  {key:'temperatureMin',label:'Temperaturbereich Beginn',unit:'°C',read:s=>s.temperatureMin},
  {key:'temperatureMax',label:'Temperaturbereich Ende',unit:'°C',read:s=>s.temperatureMax}
]);
function calculate(s,p=s.pressure,t=s.temperature,direction=s.direction||'up'){
  const frac=p/100,dT=t-25,volts=s.excitation;
  const effectiveSpan=s.span*s.bridgeGain;
  const spanFactor=1+(s.tke*dT+s.tkeQuadratic*dT*dT)/1e6;
  const spanMilliVolt=effectiveSpan*volts*spanFactor;
  const offsetTempMilliVolt=volts*(s.tk0*dT+s.tk0Quadratic*dT*dT)/1000;
  const shape=4*frac*(1-frac);
  const hystSign=direction==='down'?1:-1;
  const hysteresisMilliVolt=spanMilliVolt*(s.hysteresis/100)*(hystSign/2)*shape;
  const nonlinearityMilliVolt=spanMilliVolt*(s.nonlinearity/100)*shape;
  const creepMilliVolt=spanMilliVolt*(s.creepPercentFS/100)*frac*(1-Math.exp(-s.elapsedSeconds/s.creepTauS));
  const out=s.offset+offsetTempMilliVolt+spanMilliVolt*frac+
    nonlinearityMilliVolt+hysteresisMilliVolt+creepMilliVolt+s.drift/1000;
  const arm=s.bridgeResistance;
  const ratio=out/(volts*1000),dr=arm*ratio;
  // Idealised symmetric equivalent full bridge, not a map of real shunt settings.
  const r1=arm-dr,r2=arm+dr,r3=arm+dr,r4=arm-dr;
  const ptcR=s.ptcR25*(1+s.ptcPpm*dT/1e6);
  const ptcValid=!s.ptcEnabled||ptcR>0;
  const totalCurrentMilliAmp=1000*volts/arm+(s.ptcEnabled&&ptcR>0?1000*volts/ptcR:0);
  return {out,mvPerV:out/volts,spanMilliVolt,effectiveSpan,offsetTempMilliVolt,
    hysteresisMilliVolt,creepMilliVolt,nonlinearityMilliVolt,
    r1,r2,r3,r4,rin:arm,vcm:volts/2,ptcR,totalCurrentMilliAmp,
    resistanceValid:Math.abs(ratio)<1&&[r1,r2,r3,r4].every(v=>v>0),
    ptcValid,spanValid:spanFactor>0};
}
const defaultTestPoints=()=>[
  {pressure:0,temperature:25,direction:'up',min:null,max:null},
  {pressure:100,temperature:25,direction:'up',min:null,max:null},
  {pressure:0,temperature:0,direction:'up',min:null,max:null},
  {pressure:100,temperature:0,direction:'up',min:null,max:null},
  {pressure:0,temperature:75,direction:'up',min:null,max:null},
  {pressure:100,temperature:75,direction:'up',min:null,max:null},
  {pressure:50,temperature:25,direction:'down',min:null,max:null}
];
function checkLimits(value,limit){
 if(!limit||limit.min==null&&limit.max==null)return 'unset';
 if(limit.min!=null&&limit.max!=null&&limit.min>limit.max)return 'invalid';
 if(limit.min!=null&&value<limit.min)return 'fail';
 if(limit.max!=null&&value>limit.max)return 'fail';
 return 'pass';
}
root.SensorBridgeCharacteristics=Object.freeze({extraDefaults,extraRanges,expectedDefinitions,defaultTestPoints,calculate,checkLimits});
})(window);
