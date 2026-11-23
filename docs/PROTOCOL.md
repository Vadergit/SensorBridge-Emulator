# Web Bluetooth protocol · v1 (provisional)

This document defines the future interface between the UI, ESP32-C3 firmware, and optional SSC calibration web applications. The device is a **BLE GATT peripheral**; the browser is the client.

> This is a development contract, not a verified hardware-control protocol. The reference firmware stores simulation inputs and returns a status, but intentionally **does not drive any digital potentiometer**.

## GATT

| Item | UUID | Properties |
|---|---|---|
| Service | `eaa10000-29f1-4a63-9d72-fd49d8b6c100` | primary |
| Command | `eaa10001-29f1-4a63-9d72-fd49d8b6c100` | write with response |
| Status | `eaa10002-29f1-4a63-9d72-fd49d8b6c100` | read / notify (planned) |

Device name: `SensorBridge-C3`.

### Short command frame

To fit into modest BLE MTU sizes we send an ordered parameter vector:

```json
{"v":1,"t":"set","p":[5,2,0,50,25,0,0,0,0,0,10000,4000]}
```

Order of fields:
1. excitation V
2. span mV/V
3. offset mV
4. pressure %
5. temperature °C
6. TK0 µV/V/K
7. TKE ppm/K
8. nonlinearity % FS
9. drift µV
10. PTC enabled 0/1
11. PTC R at 25 °C in Ω
12. PTC coefficient ppm/K

Do not use the state of this frame as proof of a physical output. The analogue stage must report an additional hardware-enabled/readback flag after validated implementation.

### Read status

Status JSON example:
```json
{"v":1,"status":"demo","analogueEnabled":false}
```

The initial firmware responds with **`analogueEnabled: false`** and never controls SPI. The app must display this conspicuously.

## External integration

The calibration web application can embed this panel or import the `app.js` controller routines. Web Bluetooth access requires:
- HTTPS or localhost;
- a user gesture to request device permission;
- a user-approved device;
- exclusive coordination if two browser tabs or applications want to control the same device.

For a stable integration, build a small shared `SensorBridgeClient` module with methods:
`connect()`, `disconnect()`, `setProfile(profile)`, `setPressure(percent)`, `setTemperature(celsius)`, `readStatus()`, and `subscribeTelemetry(callback)`.

Implement a lease/ownership policy and command acknowledgements before automated SSC calibration runs. Calibration software must not assume the device is in the commanded state until the device reports **settled output verified by ADC**.

## Next protocol revision

- framed/fragmented transfers for constrained MTU
- `capabilities` discovery and model-specific safety limits
- timestamps and monotonic sequence numbers
- BLE notification telemetry (measured EXC, SIG±, bridge current, actual AD5270 codes, errors)
- writable hardware enable only after self-test and output-range checks
- power-loss default safe state
