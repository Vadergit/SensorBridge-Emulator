# Validation and safety checklist

**STOP: Hardware has not been built or validated.** Previous EasyEDA drafts had failed footprint attribution on conversion to PCB. The github app should not be taken as evidence that those errors are resolved.

## Before ordering any PCB

- [ ] Verify LCSC IDs against manufacturer datasheets and EasyEDA Pro library symbols/pads/footprints.
- [ ] Inspect all AD5270 pins against datasheet, including EXT_CAP, SDO chain, SYNC and shared supplies.
- [ ] Verify whether the intended SPI isolator supports the chosen daisy chain and readback topology.
- [ ] Check isolation supply regulator loop, headroom, ripple, maximum sink/source load, and enable sequencing.
- [ ] Confirm no AD5270 resistor terminal exceeds VSS/VDD during start-up, shutdown and unplugged USB.
- [ ] Determine whether 1–4 mV/V at ±1 V offset is compatible with the target SSC's common-mode/input range.
- [ ] Confirm ring-break jumpers permit four **independent** four-wire resistance readings with all external connections removed.
- [ ] Check temperature-current function against the actual SSC's allowed temperature sensor type and current measurement algorithm.
- [ ] Cross-check all footprints with the JLCPCB PCBA parts catalog and assembly orientation.

## Bench bring-up

1. Power the isolated supplies only; measure with DMM and oscilloscope for noise/ripple.
2. Confirm safe default states and MCU USB isolation.
3. Test isolated SPI and one AD5270 **without connecting an SSC**.
4. Connect a current-limited laboratory supply to excitation pins, then sweep coarse stage.
5. Log output differential voltage, current, common-mode and resistance.
6. Repeat for mid/fine stages and temperature extremes; verify effective resolution, noise and drift.
7. Test optional PTC relay in both positions, checking total excitation current and leakage when off.
8. Test resistance measurement while powered off and disconnected.
9. Only then connect a sacrificial E703.11 board and validate its AFE input limits.

## Acceptance metrics

Never present theoretical step sizes as guaranteed accuracy. Measure:
- peak-to-peak noise at a specified bandwidth and settling time;
- maximum integral error against DMM;
- repeatability of code changes in both directions;
- temperature drift in µV/K under controlled chamber changes;
- long-term drift over 24 h;
- supply-ratiometric behaviour, and all SSC input protections.

## Firmware interlocks

The prototype BLE firmware is **configuration-only**. The eventual hardware build must keep power-on outputs disabled until all rail and ADC checks pass. External calibration-app commands must require explicit enable, setpoint readback and settled confirmation.
