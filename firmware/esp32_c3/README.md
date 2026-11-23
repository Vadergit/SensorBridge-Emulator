# ESP32-C3 BLE demonstration firmware

**Status: prototype only, unverified on a physical ESP32-C3 SuperMini.** The firmware makes a BLE GATT service visible to desktop Chrome/Edge and accepts small configuration frames. It **does not configure SPI, AD5270s, relay, ADC, or the bridge output**.

## Build with PlatformIO

- Install VS Code / PlatformIO.
- Open the repository as a PlatformIO project by pointing PlatformIO at `firmware/esp32_c3`.
- Select `env:esp32-c3-supermini`, compile, flash to ESP32-C3 via USB.
- Open serial monitor at 115200 baud. A device advertising `SensorBridge-C3` should appear.
- From the hosted browser app, connect over Web Bluetooth. Chrome/Edge require a HTTPS origin or localhost.

### Warnings

The `esp32-c3-devkitm-1` board setting is generic and may require adjustment for your SuperMini (boot pin, USB upload method, flash size). The dependency APIs may change with NimBLE-Arduino versions. This exact build has **not** been compiled or flashed here.

No calibration setpoint is a physical bridge value. Do not connect a real SSC based on this firmware.

## Transport

See [Protocol](../../docs/PROTOCOL.md). Each characteristic write is a compact command such as `{"v":1,"k":"3","x":50}` (pressure percent). The firmware stores numeric settings in RAM and always reports `analogueEnabled=false`.

## Next milestone

After electrical design review: implement SPI isolation, nine AD5270 drivers, verified analogue power sequencing, output ADC, checksum/calibration lookup, safe disconnect interlocks and a hardware-enabled state.

## USB-Firmwareupdate aus der Weboberfläche (ESP Web Tools)

Die SensorBridge-Webseite besitzt unter **Firmwareupdate** einen USB-Installer für den ESP32-C3 SuperMini. Der Installer verwendet **esp-web-tools@10.5.2**, also denselben Ansatz wie der ELMOS-Konfigurator.

Ein GitHub-Actions-Workflow (`.github/workflows/build-esp32c3.yml`) kompiliert die BLE-Testfirmware und veröffentlicht die Dateien hier:

- `firmware/releases/esp32-c3/v0.1.0/sensorbridge-esp32c3.bin`
- `firmware/releases/esp32-c3/v0.1.0/manifest.json`

Beim Laden der Webseite wird zunächst geprüft, ob sowohl das Manifest als auch das BIN-Image verfügbar sind. Nur dann wird die USB-Installation freigeschaltet.

**Wichtig:** Das Bundle enthält Bootloader, Partitionstabelle und Programm für einen ESP32-C3 SuperMini mit nominell 4 MB Flash. Vor dem Flashen ggf. die Platinenvariante und den Boot-Modus überprüfen. Beim USB-Flashen kann die bestehende Firmware überschrieben werden. Die aktuelle Version enthält ausschliesslich ein BLE-GATT-Demo und steuert **keine reale Analogelektronik** an.

Das USB-Flashen wurde hier noch nicht an einer physischen ESP32-C3-Platine durchgeführt. Der GitHub Actions Firmware-Build wurde erfolgreich abgeschlossen.
