# SensorBridge Emulator

**Programmable Wheatstone Bridge Emulator for Sensor Calibration and Testing**

A development project for simulating an untrimmed resistive pressure-sensor bridge, with adjustable offset, sensitivity, temperature effects and reproducible test profiles. The intended user interface is a **Web Bluetooth** application for Chrome and Edge, with future integration into a manufacturer-independent SSC calibration platform.

> **Project status: early prototype / NOT production-ready.** The web application provides a working offline mathematical simulation. Bluetooth requires matching firmware; the real analogue hardware and the previous EasyEDA schematic are **not electrically verified**. Do not connect an SSC or order PCB assemblies before reviewing the hardware safety checklist.

## [Open the Web UI](https://vadergit.github.io/SensorBridge-Emulator/)

After enabling GitHub Pages (Settings → Pages → Deploy from branch → main / root), the application can run on the URL above via HTTPS. You can try all parameters immediately with **Demo mode**, without hardware.

## Sensor data sheet and real operating points

The web UI includes a **physical pressure setpoint** and a configurable pressure range. Enter for example `0–10 bar`, `6.5 bar`, and `75 °C`; the simulation maps this to `65 % FS` and calculates the bridge signal including enabled TK0/TKE, hysteresis and gain. Supported pressure units: **bar, mbar, kPa, MPa, psi and Pa**. It also supports a configurable operating temperature range (−40 to 125 °C).

Other configurable characterisation values include bridge gain, bridge-arm resistance, hysteresis (up/down), TK0/TKE and second-order temperature terms, nonlinearity, drift, and time-dependent creep. Expected min/max ranges for individual parameters and test-point limits can be entered separately. Physical pressure/temperature corners are editable in a table and exported with the profile.

See [sensor profiles and examples](docs/SENSOR_PROFILES.md) and [example profile](examples/0-10bar-75C.json).

> All of these are currently **mathematical simulations**. The BLE test firmware accepts only 12 legacy base fields; it does not apply physical pressure, gain, hysteresis or other advanced characteristics to analogue outputs. The relative/absolute pressure selector is a definition of the pressure reference, not an automatic atmospheric offset converter.

## Intended features

- Passive 10 kΩ-arm Wheatstone bridge, powered from the attached SSC (EXC+/EXC−), with 2.54 mm sensor connector
- Span from **1 to 4 mV/V**, adjustable excitation reference, optional large signed imbalance (target up to ±1 V at 5 V excitation; feasibility and SSC input range to verify)
- Virtual pressure 0–100 %, adjustable zero offset, TK0, TKE, nonlinearity, drift and temperature
- Optional simulated temperature-dependent excitation current / PTC branch, disconnected when disabled
- Separate coarse, medium and fine calibration stages with hardware isolation/jumpers, Kelvin test access
- ESP32-C3 BLE GATT controller; galvanic isolation between USB/controller and SSC-side electronics
- Presets, JSON import/export, simulated curve and raw resistance calculations
- Planned external control by the SSC calibration web application using a versioned interface

## Current working functionality

| Feature | Status |
|---|---|
| Browser UI and mathematical bridge model | Implemented; demonstration only |
| Presets and JSON export/import | Implemented in browser (profile schema v3) |
| BLE connection UI, protocol client | Implemented for 12 base fields; advanced profile remains browser-only |
| ESP32-C3 BLE GATT demonstration firmware | Reference prototype, unverified on hardware |
| AD5270 control, SPI isolation, feedback ADC | **Not implemented / not validated** |
| Sensor bridge circuit and temperature-current emulation | **Draft electrical architecture** |
| KiCad/EasyEDA Pro PCB manufacturing files | **Not verified** |

## Project layout

```text
index.html                 Browser control panel
style.css                  Responsive visual design
app.js                     Model, profiles, Bluetooth client and UI
docs/CONCEPT.md            Electrical architecture and constraints
docs/PROTOCOL.md           BLE GATT and future integration contract
docs/VALIDATION.md         Hardware test and safety plan
hardware/BOM.csv           Preliminary sourcing plan, not a JLCPCB order BOM
firmware/esp32_c3/         BLE reference firmware with simulation-only commands
```

## Browser use

1. Open [the UI](https://vadergit.github.io/SensorBridge-Emulator/) over HTTPS (or run locally via `localhost`).
2. Select **Demo** and adjust pressure, sensitivity, offset and temperature; the displayed signal is calculated, not measured.
3. With a compatible ESP32-C3 prototype running the GATT firmware, click **Verbinden (BLE)** in desktop Chrome or Edge.
4. Never assume that adjusting a UI value has changed real hardware until the device confirms it. Hardware output remains intentionally disabled in the initial firmware prototype.

## Core model

Let `p` be fractional pressure between 0 and 1; `T_ref = 25 °C`; `E` be excitation in volts; `S` be nominal span in mV/V; `O` be zero offset in mV. The demonstration differential voltage in mV is

```
signal_mV =
  O
  + TK0_uV_per_V_per_K * (T - 25) * E / 1000
  + S * E * (1 + TKE_ppm_per_K * (T - 25) / 1e6) * p
  + S * E * (nonlinearity_percent_FS / 100) * 4 * p * (1 - p)
  + drift_uV / 1000
```

The resistance values shown by the web application are an **idealised symmetric equivalent**, not an AD5270 configuration or calibration result.

## Hardware caution

Previous circuit concepts assumed four nominal **10 kΩ arms** (which gives **10 kΩ input resistance between EXC+ and EXC−**, two 20 kΩ branches in parallel). Replacing the bridge arm values with shunt networks changes input resistance and common-mode conditions. At large offsets, both SSC limits and internal analogue behaviour must be verified.

**Critical:** the AD5270's resistor terminals must remain within its own supply rails and its digital circuitry contributes leakage. Galvanic SPI isolation does *not* make the digital potentiometers passive or eliminate leakage. The optional PTC branch changes excitation current, and any changes to the bridge shunt settings change it too. Hardware measurement and firmware correction are required.

See [architecture](docs/CONCEPT.md), [validation](docs/VALIDATION.md) and the [preliminary BOM](hardware/BOM.csv).

## Sources

- [Analog Devices AD5270 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/AD5270_5271.pdf)
- [Web Bluetooth API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

## Development

No build tooling is required for the frontend: `index.html`, `style.css` and `app.js` form a static application. For local testing, run `python -m http.server 8000`, then open `http://localhost:8000`.

## Licensing

No licence has been selected. Please choose a licence before third-party contributions or reuse.
