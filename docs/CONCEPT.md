# Hardwarekonzept · SensorBridge Emulator

**Status:** Rev C concept, not an electrically validated schematic. The last EasyEDA import had incorrect/incomplete footprint mappings; do not use it as production data.

## Goal

Emulate an untrimmed resistive sensor **full bridge** (Wheatstone), including very small pressure sensitivity and deliberately large zero imbalance for testing Sensor Signal Conditioners (SSCs). Support integration with the ELMOS E703.11 and future SSCs.

### Target operating envelope (development targets, not measured specifications)

| Parameter | Target |
|---|---|
| Bridge | Four nominal 10 kΩ arms (equivalent input 10 kΩ before added shunts) |
| Excitation | SSC-supplied; target 1–5 V; validate each IC's rail and start-up limits |
| Pressure sensitivity | 1–4 mV/V, 0–100 % |
| Zero offset | Up to ±1 V at 5 V excitation (NOT guaranteed inside SSC usable range) |
| Digital output granularity | Aim ≤ 1 µV; 0.1 µV theoretical target only |
| Temperature functions | Programmable TK0 / TKE and optional current-sensing PTC branch |
| Connectivity | ESP32-C3 BLE; web app on HTTPS via desktop Chrome / Edge |
| Connections | EXC+, EXC−, SIG+, SIG−, 2.54 mm |
| Debug | Four-arm Kelvin points, test pads, staged shunt jumpers, bridge-ring jumper |

**Important:** offset entered in mV is absolute at the selected excitation. A ratiometric zero-offset mode (mV/V) should be added for real-world SSC supply changes. At 1 V excitation, requesting ±1 V offset is outside an ideal passive full bridge's attainable range.

## Intended analogue architecture

```text
ESP32-C3 SuperMini (USB, BLE)
       │ 3.3 V logic
       ├── isolated SPI (isolator with appropriate channels)
       │            │
       │      isolated logic/analogue side
       │            ├── AD5270 × 8 (coarse/medium/fine shunt branches)
       │            └── AD5270 × 1 (optional current/PTC path)
       │
       └── isolated power converter ── isolated analogue rails
                                               │
                   SSC EXC+ ── 10k ─ SIG+ ── 10k ─ SSC EXC−
                           └─ 10k ─ SIG− ── 10k ─┘
                            + selected shunt networks
                   optional relay contact: PTC branch only
```

The digital potentiometers **must not** have their resistor pins outside VDD/VSS, including power-up or USB-disconnected states. With SSC excitation below the AD5270 minimum supply, its logic must come from the isolated auxiliary rail, and the analogue terminal voltages must remain inside the isolated rail. Avoid backfeeding the SSC. Confirm with actual circuit measurements.

### Candidate shunt resistor architecture (prior provisional design)

| Network | Channels | Series resistor | Digital rheostat |
|---|---:|---:|---|
| Coarse: four arms | 4 | 12 kΩ | AD5270-100k |
| Medium: two arms | 2 | 150 kΩ | AD5270-100k |
| Fine: two arms | 2 | 4.53 MΩ | AD5270-100k |
| Current/PTC path | 1 | 5.90 kΩ | AD5270-20k |

These values are carried over from earlier development drafts. **They are not verified for monotonicity, zero crossing, achievable offset, leakage, noise, thermal tracking or SSC current limits.** Prior optimistic calculations of ~0.1 µV are theoretical code-step estimates, not hardware accuracy. Especially the 4.53 MΩ path is prone to leakage and parasitic errors.

### Disconnection / measurements

- A manual 2.54 mm jumper can break the resistive ring for four-terminal DMM checks. A normally removable zero-ohm bridge can short the jumper for normal performance, **but must be physically removed** before measurement.
- Disconnect all shunt networks when measuring a specific fixed arm.
- Kelvin sense should be directly at resistor terminals. Force/Sense must not be connected to energized SSC equipment during ohmmeter tests.
- The current/PTC branch is optional; a compact relay with two contacts can disconnect both terminals. Relay contact resistance mainly matters for its current model and must be characterized.
- IMPORTANT: merely opening **one corner of a ring** does **not necessarily isolate all four arms individually** if SIG/EXC external equipment and shunt branches remain connected. Verify exact net paths in the schematic; additional break points may be required.
- The SSC input measurement stage and the voltage excitation stage must remain disconnected during resistance calibration.

## Isolation and noise

The interface MCU is isolated from the sensitive SSC-side circuit. Digital isolation does not isolate **inside** each AD5270 or cure leakage and noise. Prefer guard rings around high-ohmic nodes, clean PCB surfaces, short analog tracks, low-noise supplies, and no SPI traffic during sensitive acquisitions. The AD5270 5 ppm/K typical end-to-end coefficient is not a system accuracy guarantee.

No PCB layout or JLCPCB order should be released until safety, current limiting, actual regulator values, isolation barrier and valid footprint/pin mappings are reviewed.

## Physical operating points in the browser

The web UI lets the user define a pressure range and set an actual pressure in bar, mbar, kPa, MPa, psi or Pa. It maps the selected pressure linearly to 0–100 % of bridge span. An actual temperature in °C modifies TK0, TKE and their second-order terms. Optional expected limits and editable physical corner points support an anticipated sensor-specification data sheet.

These parameters currently drive **only the software simulation**. The actual AD5270 command mapping, physically achievable offset/span, temperature behavior and output accuracy remain entirely unverified. See [Sensor profiles](SENSOR_PROFILES.md).

## Roadmap

1. Confirm passive bridge behavior in SPICE for all setpoints and rail values.
2. Test one coarse shunt and one fine shunt against calibrated DMM.
3. Verify start-up and disconnection safety with SSC varying excitation.
4. Validate the PTC-current branch and compensation of bridge-current changes.
5. Implement SPI drivers, feedback measurements, monotonic calibration map.
6. Validate with reference SSCs and then release a JLCPCB-ready EasyEDA Pro design.
