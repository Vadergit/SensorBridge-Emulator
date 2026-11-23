'use strict';
// Same ESP Web Tools approach as ELMOS E703.11 firmware-update.html.
// USB serial flashing requires a compiled SensorBridge ESP32-C3 image.
// Never reuse ELMOS firmware binaries for the SensorBridge emulator.
(function(){
 const installer=document.getElementById('firmwareInstaller');
 const status=document.getElementById('firmwareStatus');
 const version=document.getElementById('firmwareVersion');
 const button=installer.querySelector('button[slot=activate]');
 const release='firmware/releases/esp32-c3/v0.1.0/';
 let installerLoaded=false;
 function message(text){status.textContent=text;}
 async function check(){
   installer.hidden=true;button.disabled=true;
   version.textContent='Wird geprüft';
   if(!window.isSecureContext||!('serial' in navigator)){
     version.textContent='USB nicht unterstützt';
     message('USB-Installer benötigt Chrome oder Edge auf einem Computer sowie HTTPS oder localhost. Trenne ausserdem offene USB-Seriellverbindungen.');
     return;
   }
   try{
     const response=await fetch(release+'manifest.json',{cache:'no-cache'});
     if(!response.ok)throw Error('Manifest nicht veröffentlicht ('+response.status+')');
     const manifest=await response.json();
     const build=(manifest.builds||[]).find(entry=>entry.chipFamily==='ESP32-C3');
     const part=build?.parts?.find(entry=>typeof entry.path==='string');
     if(!part)throw Error('Kein ESP32-C3 Firmware-Image im Manifest');
     const binary=new URL(part.path, new URL(release,location.href));
     if(binary.origin!==location.origin)throw Error('Firmware muss aus diesem Repository geladen werden');
     // HEAD ensures that flashing isn't enabled until the actual .bin exists.
     const checkBinary=await fetch(binary.href,{method:'HEAD',cache:'no-cache'});
     if(!checkBinary.ok)throw Error('Kompilierte Firmware noch nicht verfügbar ('+checkBinary.status+')');
     if(!installerLoaded){
       await import('https://unpkg.com/esp-web-tools@10.5.2/dist/web/install-button.js?module');
       await customElements.whenDefined('esp-web-install-button');
       installerLoaded=true;
     }
     installer.setAttribute('manifest',release+'manifest.json');
     installer.hidden=false;button.disabled=false;
     version.textContent=manifest.version||'Firmware bereit';
     message('Firmware bereit. Mit «Firmware über USB installieren» öffnet sich derselbe USB-Installer wie beim ELMOS-Konfigurator. Der ESP32 muss am USB-Port hängen.');
   }catch(err){
     version.textContent='Noch keine Firmware';
     message('USB-Update vorbereitet, aber noch nicht verfügbar: '+err.message+'. Sobald die SensorBridge-Firmware erfolgreich kompiliert und veröffentlicht ist, wird der Installationsknopf hier freigeschaltet.');
   }
 }
 document.getElementById('checkFirmwareBtn').addEventListener('click',check);
 check();
})();