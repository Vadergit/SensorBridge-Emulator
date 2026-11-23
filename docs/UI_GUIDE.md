# SensorBridge Bedienung · v0.4

Das neue **Control Center** übernimmt die visuelle Grundlinie des ELMOS E703.11 Kalibrierassistenten: klare Karten, dezente blaue Markierungen, Hell-/Dunkelmodus sowie eine linke Navigation.

## Navigation

| Menü | Funktion |
|---|---|
| Übersicht | Signal, Druck, Temperatur, Sensorprofil und nächster Arbeitsschritt |
| Sensor definieren | Druckmessbereich, Temperaturbereich, Brückenspanne und Gain, TK0/TKE, Hysterese, Drift, Kriechen, PTC / NTC |
| Emulation | Aktuell anliegenden Druck und Temperatur direkt einstellen; BLE-Gerät ansprechen |
| Kennlinien & Eckpunkte | Berechnete Temperaturkennlinien, Auf-/Ab-Hysterese, erwartete Grenzwerte und Prüfpunkt-Tabelle |
| Profile | Sensorprofile als JSON importieren/exportieren und lokal im Browser speichern/laden |
| Firmwareupdate | ESP32-C3 SuperMini über USB-C mit ESP Web Tools installieren (bei vorhandener kompilierter Firmware) |
| Einstellungen | Hell, Dunkel, System; lokale Profile verwalten; Dokumentation öffnen |

Externe Links öffnen in einem **neuen Browser-Tab**.

## Druckvorgabe in bar, mbar, psi oder %

Unter **Sensor definieren** zuerst den physikalischen Messbereich, z. B. **0 bis 10 bar**, festlegen. Bei Bedarf kann die Einheit auch mbar, psi, kPa, MPa oder Pa sein.

Unter **Emulation** kann die Druckvorgabe wahlweise erfolgen als:
- **physikalischer Druck:** z. B. 6.5 bar. Der Browser berechnet automatisch `65 % FS`;
- **% FS:** z. B. 65 %, daraus werden bei 0–10 bar wieder 6.5 bar.

Beim Einheitenwechsel werden die physikalische Druckdefinition und vorhandene Prüfpunkte umgerechnet. Die elektrische Simulation bleibt unverändert.

Die Temperatur ist direkt in **°C** einstellbar. Die Temperaturgrenzen werden unter **Sensor definieren** vorgegeben.

## Profile

**JSON exportieren:** Lädt Sensorprofil, erwartete Min-/Max-Grenzen und Prüfpunkte herunter. Das JSON kann später in der SSC-Kalibriersoftware verwendet werden.

**JSON importieren:** Lädt die Werte nach Validierung zurück.

**Profil lokal speichern:** Speichert dieselben Daten im lokalen Speicher des Webbrowsers. Diese Speicherplätze sind nur auf diesem Computer / Browserprofil vorhanden; sie werden nicht automatisch zwischen Geräten synchronisiert.

## Hell / Dunkel

Oben rechts über das Symbol **◐** direkt umschaltbar. Unter **Einstellungen** kann man Hell, Dunkel oder das Betriebssystemdesign auswählen. Die Auswahl wird lokal gespeichert.

## Firmwareupdate per USB (wie beim ELMOS-Konfigurator)

Der Installer nutzt denselben Ansatz und dieselbe Bibliothek wie die bestehende ELMOS-Firmwareupdate-Seite:

```
esp-web-tools@10.5.2
<esp-web-install-button manifest="firmware/releases/esp32-c3/v0.1.0/manifest.json">
```

Das Manifest verweist ausschliesslich auf SensorBridge-Binaries für **ESP32-C3**. Ein GitHub Actions Workflow kompiliert den vorhandenen BLE-Demofirmwarecode und erzeugt ein zusammengeführtes ESP32-C3-Abbild.

Der Installationsknopf wird erst aktiviert, wenn **Manifest und Firmware-Binärdatei tatsächlich erreichbar** sind und Browser/USB unterstützt werden. Ein leeres Manifest oder fehlendes BIN darf **kein** Update zulassen.

1. ESP32-C3 SuperMini per USB-C verbinden.
2. Andere Programme mit offenem seriellen Port schliessen.
3. Seite über HTTPS in Chrome oder Edge öffnen.
4. Bereich **Firmwareupdate** aufrufen und USB-Port auswählen.
5. Installation ausführen; bei Bedarf BOOT beim Reset halten, um in den Download-Modus zu wechseln.
6. Danach USB-Verbindung neu aufbauen und Bluetooth-Gerät `SensorBridge-C3` verbinden.

**Warnung:** Die aktuelle Firmware ist ein *BLE-Kommunikationsprototyp*. Sie empfängt Parameter, steuert aber noch keine AD5270, keinen PTC-Zweig und keine realen Brückenausgänge. Der USB-Installer kann vorhandene Firmware/gespeicherte Daten auf dem ESP32 überschreiben.

## Weitere Informationen

- [Sensorprofile und Kennlinien](SENSOR_PROFILES.md)
- [BLE-Protokoll](PROTOCOL.md)
- [Hardwarekonzept](CONCEPT.md)
- [Firmware-Build](../firmware/esp32_c3/README.md)

## v0.5: Aufgeräumte Eingaben und NTC

Alle Felder verwenden einheitliche Höhen, Abstände und Schriftgrössen, mit zwei oder drei Spalten je nach Bereich und Bildschirmbreite. Die Eingabe akzeptiert **3,5** oder **3.5**. Werte werden beim Verlassen des Feldes übernommen, damit unvollständige Dezimalzahlen nicht mitten in der Eingabe zurückspringen. Unter **Sensor definieren → Temperaturwiderstand** wählt man **Aus / PTC / NTC**.

- PTC: Widerstand R25 und linearer Temperaturkoeffizient ppm/K.
- NTC: Widerstand R25 und Beta-Wert in K.

Die Auswertung ist ein mathematisches Modell. NTC/AD5270 sind in der realen Firmware noch nicht umgesetzt. Die aktuelle BLE-Demofirmware unterstützt weiterhin nur 12 Basiseinstellungen.

## v0.8 – Formeln und Auflösung

Unter **Berechnungen & Auflösung** werden die mathematischen Formeln links und die aktuelle Einsetzung rechts dargestellt. Die Werte sind live mit Sensorparametern, Druck und Temperatur gekoppelt. Daneben werden die idealisierten AD5270-Schrittweiten sowie die prinzipiell darstellbaren PTC-/NTC-Widerstandsbereiche berechnet.

Die maximale reale Ausgangstoleranz ist noch unbekannt, auch wenn die Software ein theoretisches Quantisierungsniveau zeigt.

Unter **Wiki & Hilfe** sind die Parameter über kleine, dezente **?**-Schaltflächen erklärt. Alle Links auf externe Seiten öffnen in einem neuen Tab. Der Anfangsdruck ist jetzt **0 bis 100 % FS**; bar, mbar oder psi sind optional.

Siehe [ausführliche Berechnungen](CALCULATIONS_AND_RESOLUTION.md) und [Fachbegriffe](WIKI.md).
