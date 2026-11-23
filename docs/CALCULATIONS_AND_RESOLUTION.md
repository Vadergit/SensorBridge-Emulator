# Formeln, Schrittrechnung und theoretische Auflösung

**Stand: v0.8 · SensorBridge Emulator · mathematische Simulation / nicht validierte Hardware**

Die Webanwendung bietet unter **Berechnungen & Auflösung** zwei Spalten: links die allgemeine mathematische Formel und rechts die Rechnung mit den aktuell eingestellten Werten. Die Parameter werden bei jedem Setpoint-Wechsel neu berechnet.

## 1. Allgemeines Signalmodell

| Grösse | Formel | Beispiel |
|---|---|---|
| Temperaturdifferenz | `ΔT = T − 25 °C` | 75 °C − 25 °C = 50 K |
| Druckhub | `p = (P − Pmin)/(Pmax − Pmin)` | 65 % FS → p = 0.65 |
| Vollhubspanne | `S0 = E × S × Gain` | 5 V × 2 mV/V × 1 = 10 mV |
| TKE-Faktor | `kT = 1 + (TKE × ΔT + TKE2 × ΔT²)/10⁶` | TKE = 1000 ppm/K, ΔT = 50 K → 1.05 |
| Spanne bei Temperatur | `ST = S0 × kT` | 10 mV × 1.05 = 10.5 mV |
| Nullpunkt | `V0 = Offset + E × (TK0 × ΔT + TK0_2 × ΔT²)/1000 + Drift/1000` | TK0 = 1 µV/V/K → +0.25 mV bei 5 V / +50 K |
| Lineares Drucksignal | `Vp = ST × p` | 10.5 mV × 0.65 = 6.825 mV |
| Nichtlinearität | `Vnl = ST × (NL/100) × 4p(1−p)` | Quadratische Form |
| Hysterese | `Vh = ST × (H/100) × Richtung/2 × 4p(1−p)` | Richtung = +1 Abwärts, −1 Aufwärts |
| Kriechen | `Vk = ST × (K/100) × p × (1−e^(−t/τ))` | Asymptotische Zeitfunktion |
| Signal | `Vout = V0 + Vp + Vnl + Vh + Vk` | Summe aller Beiträge in mV |

Das sind **keine allgemeinen physikalischen Sensorgesetze**: Nichtlinearität, Hysterese und Kriechen sind bewusst vereinfachte Simulationsmodelle. Ein realer Sensor kann andere Funktionsformen haben. Insbesondere ist ein maximaler Nullpunktoffset von ±1 V ein **Entwicklungsziel**, kein validierter Ausgangsbereich der vorgesehenen Schaltung.

## 2. Schrittweiten der Weboberfläche

Die Schieberegler verwenden derzeit diese Schritte:

| Parameter | UI-Schritt | Theoretische Positionen |
|---|---:|---:|
| Druckhub | 0.001 % FS | 100'001 von 0–100 % |
| Temperatur | 0.001 °C | 165'001 im Bereich −40 bis +125 °C |
| Druckwert im Bereich | Bereich/10'000 | Variabel (physikalischer Regler) |

Die **numerischen Eingabefelder** akzeptieren auch Kommazahlen und berechnen mit JavaScript-Fliesskommazahlen. Die UI-Schritte sagen **nichts** über die kleinste tatsächlich erreichbare Ausgangsspannung aus.

Bei ideal 10 mV Vollhub bewirkt ein UI-Schritt von 0.001 % FS eine lineare Ausgangsänderung von `10 mV × 0.001/100 = 0.0001 mV = 0.1 µV`. Die echte Analogschaltung kann dies noch nicht garantieren.

## 3. AD5270: theorische Einzelarm-Rechnung

Aus dem Datenblatt von Analog Devices: **AD5270 = 10 Bit / 1024 Positionen**, SPI, Nennwerte 20/50/100 kΩ. Die Herstellerangabe zum nominalen Endwiderstand ist bis zu **±1 % unter den spezifizierten Betriebsbedingungen** (R-Perf), nicht eine ±1-%-Garantie für den SensorBridge-Ausgang.

Im bisherigen Entwurf sind acht 100-kΩ-Steller und ein 20-kΩ-Steller vorgesehen. Die Simulation betrachtet hier **nur einen einzigen R1-Parallelzweig an einer ansonsten unveränderten symmetrischen Brücke**:

```
D = 0 … 1023
Rpot_ideal(D) = RAB × D / 1024
Rshunt(D)     = Rseries + Rpot_ideal(D)
R1eff(D)      = (Rarm × Rshunt) / (Rarm + Rshunt)
SIG+          = EXC × R2 / (R1eff + R2)
SIG−          = EXC × R4 / (R3 + R4)
Vdiff(D)      = SIG+ − SIG−
Schritt(D)    = |Vdiff(D+1) − Vdiff(D)| für D=0…1022
```

In dieser Musterrechnung werden Wiperwiderstand, Codefehler, Leckstrom, Toleranzen und andere Shunts **absichtlich weggelassen**. Die Richtung oder exakte Zuordnung aller acht Stellzweige der fertigen Brücke ist noch **nicht** validiert.

### Beispielrechnungen bei 5 V, vier Brückenarmen à 10 kΩ

| Idealisiertes Netzwerk | Kanäle | 10-Bit-Positionen | Minimale Schrittweite | Maximale Schrittweite | Änderung über ganzen Codebereich |
|---|---:|---:|---:|---:|---:|
| Grob: 12 kΩ + AD5270-100k | 4 | 1024 je Kanal | ca. 89.40 µV | ca. 4199.76 µV | ca. 628.37 mV je Einzelzweig |
| Mittel: 150 kΩ + AD5270-100k | 2 | 1024 je Kanal | ca. 18.79 µV | ca. 50.78 µV | ca. 31.61 mV je Einzelzweig |
| Fein: 4.53 MΩ + AD5270-100k | 2 | 1024 je Kanal | ca. 0.0568 µV | ca. 0.0594 µV | ca. 0.0594 mV je Einzelzweig |

Die **Schritte sind nicht konstant**: Die exakte Ausgangsspannung ist eine nichtlineare Funktion des digitalen Widerstandscodes. Die in der Weboberfläche gezeigten Werte werden für die eingestellte Erregung und den aktuellen Brückenwiderstand dynamisch berechnet.

**Wichtige Konsequenz:** Selbst wenn ein *einziger* idealer Feinabgleich-Zweig in dieser Rechnung Schritte von rund 0.06 µV hätte, sind die reale Gesamtausgangsspanne und die Feinauflösung von der späteren Kombination der Grob-, Mittel- und Feinkanäle, dem Kalibrationsalgorithmus sowie vom Rauschen und den Leckströmen abhängig. `1024^8` mögliche Codes sind **keine** Garantie für dieselbe Anzahl unabhängiger, stabiler und gleichmässig verteilter Ausgangssignale.

## Direkte Umrechnung von µV in % des Sensorhubs

Die lokale ideale Hubauflösung ergibt sich aus der AD5270-Spannungsänderung geteilt durch die Steigung der **aktuellen** Sensorkennlinie:

```
ΔHub [% FS] ≈ ΔV_AD5270 [µV] / |d(Vout [µV]) / d(Hub [% FS])|

Beispiel:
Sollspanne = 2 mV/V × 5 V = 10'000 µV über 100 % FS
Steigung = 10'000 µV / 100 % FS = 100 µV / % FS
AD5270-Feinschritt am Code 512→513 ≈ 0.058066 µV
Idealer Hubschritt ≈ 0.058066 / 100 = 0.00058066 % FS
Halber idealer Schritt ≈ ±0.00029033 Prozentpunkte
```

Die Simulationssoftware bestimmt die lokale Steigung numerisch um den eingestellten Hubpunkt (einschliesslich Temperatur, TKE, Gain, Nichtlinearität, Hysterese und Kriechen). Bei einer nicht steigenden oder nicht eindeutigen Kennlinie wird keine fiktive gerundete Druckposition behauptet.

Die Tabelle zeigt zusätzlich, wie viel % FS ein *einzelner* Stellkanal über alle seine Codes insgesamt verändern würde. **Achtung:** Ein Grobzweig kann in der isolierten Idealbetrachtung weit mehr als 100 % einer kleinen Sensor-Nennspanne verändern. Das ist kein nutzbarer kalibrierter Messbereich und kann die SSC-Eingangsgrenzen überschreiten. Es darf nicht mit dem stabil einstellbaren Gesamtbereich der acht Kanäle verwechselt werden.

## Live-Hubauflösung in % FS

Unter **Emulation** direkt neben dem Druck-Setpoint werden jetzt vier Werte angezeigt:

- **Gewünschter Hub:** der eingestellte Sollwert in Prozent des vollen Sensorhubs.
- **Rastermodell: nächster Hub:** theoretisch gerundeter Wert aus einem *fiktiv über 0–100 % wiederholten* Feinschritt.
- **Abweichung:** Differenz zwischen dem idealisierten Rasterwert und dem gewünschten Hub in **Prozentpunkten**.
- **Lokaler Fein-Schritt:** idealisierte %FS-Änderung eines einzelnen Fein-AD5270 bei Code 512→513, umgerechnet mit der **aktuellen** Kennliniensteigung bei Druck, Temperatur, Gain und Fehlerparametern.

Die Grob-/Mittel-/Feinschritte werden darunter auch in **% FS pro Code** dargestellt, einschliesslich des theoretisch beeinflussten Hubbereichs je Einzelkanal.

**Wichtig:** Dieser «nächste Hub» ist **keine echte Hardwareausgabe**. Das Rastermodell setzt voraus, dass Grob/Mittel beliebig exakt zum Feinraster positionieren können und der lokale Feinschritt beliebig oft wiederholt werden kann. Das ist physikalisch nicht nachgewiesen und für einen einzelnen AD5270 nicht möglich. Der tatsächliche Ist-Hub, die Gesamtzahl erreichbarer 0–100-%-Stellwerte und die reale maximale Toleranz sind derzeit **unbekannt**. Erst nach Schaltungsvalidierung und analoger Rückmessung darf die Anzeige einen real gemessenen Istwert zeigen.

Beispiel für 5 V, 2 mV/V Nennspanne, 10-kΩ-Brückenarme, Gain 1, 25 °C und fehlerfreie Idealkennlinie:

| Grösse | Rechnerisches Beispiel |
|---|---:|
| Gesamthub | 10 mV = 100 % FS |
| Lokaler Feinschritt (ein AD5270, Code 512→513) | ca. 0.058066 µV |
| Schritt in % FS | ca. 0.00058066 % FS |
| Halber lokaler Schritt | ca. ±0.00029033 Prozentpunkte |
| Sollhub 50.000000 % FS | fiktiv gerundet ca. 50.000077 % FS |
| Abweichung im Rundungsmodell | ca. +0.000077 Prozentpunkte |
| Tatsächlicher Ist-Hub | **nicht verfügbar** |

Die Berechnung berücksichtigt, dass sich die lokale Signalsteigung durch die Temperatureinstellung und Kennlinienparameter ändern kann.

## 4. Temperaturwiderstand und Temperaturschritte

Bisheriges PTC-/NTC-Konzept: `5'900 Ω` in Reihe mit einem idealisierten `AD5270-20k`:

```
Rnetwork(D) = 5900 Ω + 20000 Ω × D/1024
D = 0…1023
Rmin = 5900 Ω
Rmax ≈ 25'880.47 Ω
Rstep_ideal = 20000/1024 ≈ 19.53125 Ω
```

### PTC-Modell

```
R(T) = R25 × [1 + TK_PTC × (T−25 °C)/10⁶]
T(R) = 25 °C + (R/R25−1) × 10⁶/TK_PTC
```

### NTC-Modell

```
R(T) = R25 × exp[B × (1/(T+273.15) − 1/298.15)]
T(R) = 1/(1/298.15 + ln(R/R25)/B) − 273.15
```

Die Weboberfläche zählt für das gewählte R25/B- oder PTC-Profil die Codes innerhalb des Temperaturbereichs und bestimmt die theoretischen Temperaturabstände. **Die Auflösung in °C ist nicht konstant**, auch wenn jeder idealisierte Widerstandsschritt rund 19.53 Ω beträgt.

**Beispiel:** NTC R25 = 10 kΩ, B = 3950 K: Bei 75 °C liegt R nur bei ca. 1.49 kΩ – deutlich **unterhalb** der angenommenen Mindestgrenze von 5.9 kΩ. Das bisherige Netzwerk könnte diesen Wert **nicht darstellen**. Das echte Schaltungskonzept müsste dafür angepasst werden.

## 5. Toleranzen / tatsächlich erreichbare Genauigkeit

| Grösse | Entwicklungsannahme |
|---|---|
| R1–R4 | 10 kΩ, 0.01 %, 2 ppm/K – Stücklistenannahme |
| Grob-/Mittel-Serien-R | 0.1 % – Stücklistenannahme |
| Fein-Serien-R | 1 % – Stücklistenannahme |
| AD5270 nominaler Endwiderstand | bis ±1 % unter den spezifizierten Bedingungen laut Datenblatt |
| Analoges Ausgangsrauschen | noch nicht gemessen |
| Fehler über Temperatur | noch nicht gemessen |
| Quantisierungsfehler ideal | bis halber lokaler Codeschritt, **nur isolierte Idealbetrachtung** |
| **Maximale reale Ausgangstoleranz** | **Nicht bekannt / nicht validiert** |

Ein Eingabefeld erlaubt ein Entwicklungsziel für die Ausgangstoleranz in ±µV. Die Weboberfläche vergleicht es nur mit der theoretischen Quantisierung des einzelnen Feinkanals, **nicht** mit einer bestätigten Hardwaregenauigkeit.

Vor einer belastbaren Spezifikation braucht es einen korrekten EasyEDA-Pro-Schaltplan, reale Bauteile und eine kalibrierte Rückmessung über Druck-, Offset-, Spannen-, Temperatur- und Speisungsbereich.

## Datenblatt

[Analog Devices: AD5270/AD5271 (Rev. H)](https://www.analog.com/media/en/technical-documentation/data-sheets/AD5270_5271.pdf)

Alle externen Links in der Weboberfläche öffnen in einem neuen Browser-Tab.
