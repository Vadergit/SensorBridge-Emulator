# Integration with Universal SSC Calibration

This project is a separate hardware simulator which should be controllable from the existing sensor-signal-conditioner calibration web application.

## Proposed flow

1. User connects the SensorBridge over **Web Bluetooth** from Chrome/Edge.
2. Universal SSC Calibration application connects its SSC via Web Serial independently.
3. User chooses or loads a known SensorBridge sensor profile.
4. Calibration wizard sets virtual pressure and temperature points.
5. **Future:** waits for confirmed analogue readback and settling; then samples SSC.
6. Compares calculated compensation settings with a known, controlled test profile and exports a calibration report.

## Shared application API (future module)

```ts
type SensorBridgeProfile = {
  excitation: number; span: number; offset: number;
  pressure: number; temperature: number;
  tk0: number; tke: number; nonlinearity: number; drift: number;
  ptcEnabled: boolean; ptcR25: number; ptcPpm: number;
};
interface SensorBridgeClient {
  connect(): Promise<void>;
  disconnect(): void;
  setProfile(profile: SensorBridgeProfile): Promise<void>;
  setPressure(percent: number): Promise<void>;
  setTemperature(degC: number): Promise<void>;
  readStatus(): Promise<unknown>;
}
```

The initial BLE protocol (see [PROTOCOL.md](PROTOCOL.md)) is **non-atomic and readback-free** and must not yet drive an automated sensor calibration. Implement verified output measurements, atomic updates, interlocks and acknowledgement/settling before connecting the automation.

For a future browser integration, consolidate the two apps' Web Bluetooth access so one browser client owns the BLE connection. A single BLE peripheral may have limited simultaneous central connections; do not rely on parallel ownership.
