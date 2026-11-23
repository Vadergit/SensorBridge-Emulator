/* Swiss-compatible decimal entry helpers. Inputs may use comma or point.
 * Reject incomplete values rather than treating a blank edit as zero.
 */
(function(root){
'use strict';
function parse(value){
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value!=='string')return null;
 const raw=value.trim().replace(/\u2212/g,'-').replace(/\u00a0/g,'');
 if(!/^[+-]?(?:(?:\d+(?:[.,]\d*)?)|(?:[.,]\d+))(?:[eE][+-]?\d+)?$/.test(raw))return null;
 const v=Number(raw.replace(',','.'));
 return Number.isFinite(v)?v:null;
}
function complete(value){
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value!=='string')return false;
 const s=value.trim();
 if(!s||/[.,eE+-]$/.test(s))return false;
 return parse(s)!==null;
}
root.SensorBridgeNumbers=Object.freeze({parse,complete});
})(window);
