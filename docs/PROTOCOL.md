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

### Compact one-parameter command frames

Each parameter is sent separately using a short JSON command, so a single write is typically ≤20 bytes even with a small BLE ATT MTU:

```json
{"v":1,"k":"3","x":50}
```

The letter/digit key maps to a parameter:

| key | parameter |
|---|---|
| 0 | excitation V |
| 1 | span mV/V |
| 2 | zero offset mV |
| 3 | pressure % |
| 4 | temperature °C |
| 5 | TK0 µV/V/K |
| 6 | TKE ppm/K |
| 7 | nonlinearity %FS |
| 8 | drift µV |
| 9 | PTC enabled: 0 / 1 |
| a | PTC resistance at 25°C, Ω |
| b | PTC coefficient ppm/K |

The browser sends **12 writes sequentially**. This is an early transport: an interrupted connection may result in a partially updated profile. Use a future atomic commit/sequence-number protocol before allowing real analogue outputs or automated calibration.

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
