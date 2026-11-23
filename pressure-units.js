/* Physical pressure engineering units for the browser simulator.
 * Internal setpoint percent: (pressure - range min)/(range max - range min).
 * No changes are applied to real hardware here.
 */
(function(root){
'use strict';
const units=Object.freeze({
  bar:{factor:100000,label:'bar'},
  mbar:{factor:100,label:'mbar'},
  kPa:{factor:1000,label:'kPa'},
  MPa:{factor:1000000,label:'MPa'},
  psi:{factor:6894.757293168,label:'psi'},
  Pa:{factor:1,label:'Pa'}
});
function convert(value,from,to){
 if(!Number.isFinite(Number(value))||!units[from]||!units[to])throw Error('Ungültige Druckumrechnung');
 return Number(value)*units[from].factor/units[to].factor;
}
function percent(physical,min,max){
 if(!(Number.isFinite(physical)&&Number.isFinite(min)&&Number.isFinite(max)&&max>min))throw Error('Ungültiger Druckmessbereich');
 return (physical-min)/(max-min)*100;
}
function physical(percentFS,min,max){
 if(!(Number.isFinite(percentFS)&&Number.isFinite(min)&&Number.isFinite(max)&&max>min))throw Error('Ungültiger Druckmessbereich');
 return min+(max-min)*percentFS/100;
}
function validRange(min,max,unit){
 return Number.isFinite(min)&&Number.isFinite(max)&&max>min&&!!units[unit]&&Math.abs(min*units[unit].factor)<=1e9&&Math.abs(max*units[unit].factor)<=1e9;
}
root.SensorBridgePressure=Object.freeze({units,convert,percent,physical,validRange});
})(window);
