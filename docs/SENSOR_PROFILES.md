# Physikalischer Druck, Temperatur und Sensoreckdaten

**Stand: Browser-Simulationsmodell v0.3 (keine gemessene Hardware).**

Die Bedienoberfläche erlaubt, ein Sensorsignal anhand eines **realen Drucks** und einer **realen Temperatur** zu berechnen. Der Druck kann in **bar, mbar, kPa, MPa, Pa oder psi** angegeben werden. Die Temperatur wird in **°C** geführt.

## Beispiel

Sensor:
- Messbereich: **0 bis 10 bar**
- Aktuell anliegender Druck: **6.5 bar**
- Anliegende Temperatur: **75 °C**
- Brückenspeisung: **5 V**
- Nennspanne: **2 mV/V**
- Gain: **1.00**
- Nullpunkt: **0 mV**
- TK0, TKE, Nichtlinearität und Hysterese zunächst 0

Der normierte Druck ist:

```
Hub [% FS] = (6.5 bar - 0 bar) / (10 bar - 0 bar) × 100 = 65 %
```

Die ideale Brückenspanne ist 2 mV/V × 5 V = 10 mV. Bei 65 % Hub beträgt das ideale Differenzsignal **6.5 mV**.

Ändert man Temperatur, TK0, TKE, Hysterese, Gain, Krümmung und Kriechen, wird das mathematisch berechnete Signal entsprechend angepasst.

## Feldübersicht

| Bereich | Einstellungen |
|---|---|
| Druck | Bereichsanfang, Bereichsende, Einheit, relativ/absolut, aktueller Druck |
| Temperatur | Bereichsanfang, Bereichsende, aktuelle Temperatur °C |
| Brücke | Erregung in V, Signalspanne mV/V, Gain, nominaler Brückenwiderstand |
| Nullpunkt | Offset mV, Drift µV, TK0 µV/V/K und quadratische TK0-Krümmung |
| Spanne | TKE ppm/K und quadratische TKE-Krümmung |
| Kennlinienfehler | Nichtlinearität % FS, Hysterese % FS, Richtung Auf-/Abwärts |
| Zeitverhalten | Kriechen % FS, Zeitkonstante, verstrichene Zeit |
| Temperaturzweig | PTC Widerstand bei 25 °C und Temperaturkoeffizient |

### Temperaturmodell

Das Modell verwendet eine Referenztemperatur **25 °C**. Bei Temperaturabweichung ΔT = T − 25 °C:

```
Offset_T [mV] = E [V] × (TK0 × ΔT + TK0_quadratisch × ΔT²) / 1000
Span_T [mV] = E [V] × Span_mV/V × Gain
              × (1 + (TKE × ΔT + TKE_quadratisch × ΔT²) / 1e6)
```

Die Nichtlinearität, Hysterese und Kriechanteile werden zusätzlich im idealisierten mathematischen Modell addiert. Die Hysterese ist als symmetrische Auf-/Ab-Abweichung mit maximaler Differenz bei **50 % FS** modelliert; reale Sensoren können eine andere Form haben.

Der Druckbereich darf auch negativ beginnen, etwa −1 bis +1 bar Relativdruck, sofern der Beginn kleiner als das Ende ist.

### Einheitenwechsel

Beim Wechsel von bar zu psi oder kPa werden Messbereich, anliegender Druck, definierte Testpunkt-Druckwerte sowie die druckbezogenen erwarteten Grenzwerte umgerechnet. Die **physikalische Druckwirkung und das Signal bleiben unverändert**.

## Grenzwerte und Prüfpunkte

Unter **Erwartete Eckdaten und Toleranzen** können optional ein Minimal- und ein Maximalwert für jeden Kennwert eingetragen werden. Die Oberfläche zeigt an, ob der **simulierte** Wert innerhalb oder ausserhalb des erwarteten Bereichs liegt.

Prüfpunkte definieren den Druck in der gewählten physikalischen Einheit, die Temperatur in °C, die Belastungsrichtung (Auf- oder Abwärts) und optional den erwarteten Brückenausgang in mV. Beispiel:

| Druck | Temperatur | Richtung | Erwarteter idealer Ausgang |
|---|---|---|---|
| 0 bar | 25 °C | aufwärts | 0 mV |
| 5 bar | 25 °C | aufwärts | 5 mV |
| 10 bar | 25 °C | aufwärts | 10 mV |
| 5 bar | 75 °C | abwärts | vom TK-/Hysterese-Profil abhängig |

Jeder Wert ausserhalb des definierten Druck- oder Temperaturbereichs wird als solcher gekennzeichnet und nicht als valide Prüfmessung betrachtet.

## JSON und externe Kalibrierprogramme

Profilformat ab dieser Version: `sensorbridge-profile/v3`. Ältere v1-/v2-Profile mit Druck in % werden beim Import automatisch auf den gewählten Bereich abgebildet; Standard für fehlende physikalische Angaben ist 0 bis 10 bar.

Die Weboberfläche zeigt den physikalischen Druck, während das vorläufige ESP32-C3-Protokoll weiterhin **den normierten Druck in % FS** und **die Temperatur in °C** verwendet. Der Testaufbau speichert aktuell nur die 12 Basisparameter; eine echte analoge Brückenansteuerung und ein bestätigter Messwert sind weiterhin nicht vorhanden.

**Wichtig:** Die Simulation stellt keinen Druck am Anschluss her. Das Gerät soll später ein elektrisches Brückensignal wie bei diesem Druck erzeugen. Die reale Signalgenauigkeit und der mögliche Einstellbereich der AD5270 müssen erst experimentell überprüft werden.
