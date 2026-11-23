# SensorBridge Emulator – Wiki & Abkürzungen

Dieses Wiki beschreibt die Parameter der Weboberfläche und deren vereinfachtes mathematisches Modell. Die zugehörigen **?**-Schaltflächen neben Eingabefeldern öffnen kurze Erklärungen und Beispiele; das Wiki ist auch direkt über die linke Navigation erreichbar.

**Standarddruck:** 0–100 % FS. % FS ist ein normierter Wert und keine physikalische Druckeinheit. Für bar, mbar oder psi muss zuerst der physikalische Messbereich angegeben werden. Ein angezeigter Beispielbereich ist keine tatsächliche Sensorkennlinie.

**Wichtige Sicherheitshinweise:** Die Formeln dienen derzeit zur Simulation. AD5270, PTC/NTC, NVM, galvanische Isolation und reale Brückenausgänge sind noch nicht hardwarevalidiert. Der momentane BLE-Firmwareprototyp erzeugt keine reale analoge Ausgangsspannung.

## Grundlagen und Modellgleichungen

Eine symmetrische Wheatstone-Vollbrücke mit vier gleich grossen 10-kΩ-Armen hat zwischen EXC+ und EXC− einen Eingangswiderstand von 10 kΩ. Das differenzielle Brückensignal wird üblicherweise in mV/V spezifiziert.

- **Hub in % FS:** `100 × (P − P_min) / (P_max − P_min)`, sofern ein physikalischer Messbereich bekannt ist.
- **Ideale Spanne in mV:** `Spanne [mV/V] × Brückenspeisung [V] × Gain`.
- **TK0-Offset in mV:** `EXC [V] × TK0 [µV/V/K] × (T−25 °C) / 1000` (zuzüglich optionalem quadratischen Anteil).
- **TKE-Faktor:** `1 + TKE [ppm/K] × (T−25 °C) / 1'000'000` (zuzüglich optionalem quadratischen Anteil).
- **PTC (linear):** `R(T) = R25 × (1 + α_ppm/K × (T−25 °C) / 1'000'000)`.
- **NTC (Beta):** `R(T) = R25 × exp[B × (1/(T+273.15) − 1/298.15)]`, Temperatur in Kelvin.

Im aktuellen Programm beeinflusst der simulierte PTC/NTC-Zweig den berechneten Speisestrom; TK0/TKE, Hysterese, Drift und Nichtlinearität beeinflussen den simulierten Differenzausgang. Die reale Umsetzbarkeit der Wertevorgaben ist noch nicht bestätigt.


## Druck

### % FS – normierter Druck

FS steht für Full Scale, also den vollen Messbereich. 0 % entspricht dem Anfang und 100 % dem Ende des definierten Sensorbereichs. Prozent ist keine physikalische Druckeinheit.

**Beispiel:** Ein Sensor 0–10 bar: 65 % FS entsprechen 6.5 bar. Ohne definierten Messbereich lassen sich 65 % nicht eindeutig in bar umrechnen.

### Druckeinheit

Standard ist % FS. Alternativ kannst du bar, mbar, psi, kPa, MPa oder Pa auswählen. Beim Wechsel von % in eine physikalische Einheit muss der echte Messbereich definiert sein.

**Beispiel:** 1 bar = 1000 mbar ≈ 14.5038 psi. Ein vorgegebener Beispielbereich ist kein echter Sensormessbereich.

### Druckmessbereich Anfang

Der kleinste Druckwert des Sensors. Bei Prozentbetrieb steht hier normalerweise 0 %. Bei physikalischer Druckvorgabe kann es auch ein negativer Relativdruck sein.

**Beispiel:** Sensor −1 bis +1 bar: Anfang = −1 bar, Ende = +1 bar.

### Druckmessbereich Ende

Der grösste Druckwert des Sensors. Der Endwert muss höher sein als der Anfangswert. Der Sensorhub wird daraus linear in Prozent berechnet.

**Beispiel:** 0–10 bar: 10 bar = 100 % FS, 2.5 bar = 25 % FS.

### Relativdruck und Absolutdruck

Relativdruck bezieht sich auf einen Referenzdruck (meist die Umgebung); Absolutdruck auf das Vakuum. Dieser Schalter dokumentiert aktuell nur den Sensortyp, ohne automatisch einen Luftdruck zu verrechnen.

**Beispiel:** 0 bar(g) ist ungefähr Umgebungsdruck; 0 bar(abs) ist das ideale Vakuum. Für die Umrechnung müsste der tatsächliche Umgebungsdruck bekannt sein.

### Anliegender Druck

Der momentan simulierte Druck. Im Standardmodus stellst du ihn als % FS ein, alternativ als realen Druck innerhalb des definierten Bereichs.

**Beispiel:** Bei 65 % FS und 2 mV/V Brückenspanne an 5 V entstehen ideal 6.5 mV, sofern Offset und Fehler 0 sind.

### Hub (% FS)

Der normierte Druck im Messbereich. Intern wird die Simulation unabhängig von bar, mbar oder psi über den Prozentsatz der Gesamtspanne berechnet.

**Beispiel:** Hub = 100 × (Druck − Bereichsanfang) / (Bereichsende − Bereichsanfang).


## Bedienung

### Druckvorgabe

Wähle, ob du den Simulator direkt mit 0–100 % FS oder mit physikalischen Druckwerten bedienen möchtest. Die Prozentvorgabe ist Standard.

**Beispiel:** Ein 0–10-bar-Sensor liefert bei 50 % den virtuellen Sensorwert für 5 bar. Die reale Hardware erzeugt dabei noch keinen Druck.


## Temperatur

### Simulierte Temperatur

Die momentane Temperatur der simulierten Messzelle in Grad Celsius. Sie beeinflusst TK0, TKE, PTC/NTC und optional die temperaturabhängige Kennlinienkrümmung.

**Beispiel:** Bei T = 75 °C beträgt die Temperaturdifferenz zur Referenz 25 °C genau 50 K.

### Temperaturbereich Anfang

Untergrenze des vorgesehenen Temperaturbereichs. Sie dient zur Begrenzung des aktuellen Werts und zur Darstellung von Temperaturkennlinien.

**Beispiel:** Zum Beispiel −20 °C für einen industriellen Drucksensor.

### Temperaturbereich Ende

Obergrenze des vorgesehenen Temperaturbereichs. Im Simulationsprofil sind derzeit −40 bis 125 °C zugelassen.

**Beispiel:** Zum Beispiel +85 °C.

### TK0 – Temperaturkoeffizient des Nullpunkts

TK0 beschreibt, wie sich der Nullpunkt mit der Temperatur verschiebt. Einheit hier: µV/V/K. Das Vorzeichen bestimmt die Verschiebungsrichtung.

**Beispiel:** TK0 = +1 µV/V/K, 5 V Speisung und +10 K Temperaturanstieg: +50 µV bzw. +0.05 mV zusätzlicher Offset.

### TKE – Temperaturkoeffizient der Empfindlichkeit

TKE beschreibt, wie stark sich die Brückenspanne mit der Temperatur ändert. Einheit ppm/K (Millionstel pro Kelvin). Er verändert die druckabhängige Steigung.

**Beispiel:** TKE = +1000 ppm/K über 50 K: relative Spannenänderung +5 %.

### TK0-Krümmung

Zusätzlicher quadratischer Temperaturanteil des Nullpunkts, bezogen auf 25 °C. Das Modell addiert einen Term proportional zu ΔT².

**Beispiel:** Mit ΔT = 20 K ist ΔT² = 400 K². Die Formel steht im Sensor-Wiki.

### TKE-Krümmung

Zusätzlicher quadratischer Temperaturanteil der Empfindlichkeit. Damit kann man über einen weiten Temperaturbereich eine gekrümmte TKE-Kennlinie simulieren.

**Beispiel:** TKE-Zusatzterm = TKE2 × (T − 25 °C)² / 1'000'000.


## Brücke

### Brückenspeisung (EXC)

Die elektrische Erregerspannung zwischen EXC+ und EXC−. Das Differenzsignal einer idealen ratiometrischen Brücke skaliert mit dieser Spannung.

**Beispiel:** 2 mV/V an 5 V liefern bei vollem Hub 10 mV; an 3.3 V entstehen 6.6 mV.

### Signalspanne (mV/V)

Das differentielle Ausgangssignal der Brücke pro Volt Speisung zwischen 0 und 100 % Druckhub. Es beschreibt die Nennempfindlichkeit.

**Beispiel:** 2 mV/V × 5 V = 10 mV Vollhub.

### Nullpunktversatz

Ein zusätzlicher Differenzsignal-Offset bei 0 % Hub, unabhängig von der eingestellten Druckspanne. Die Eingabe erfolgt im aktuellen Modell in mV (nicht mV/V).

**Beispiel:** Offset +1 mV und Spanne 10 mV: bei 0 % = 1 mV, bei 100 % = 11 mV. Hardware-Grenzen beachten.

### Brücken-Gain

Dimensionsloser Multiplikator der Nennspanne im mathematischen Modell. Gain = 1 bedeutet keine Skalierung; Gain = 1.5 erhöht die Spanne um 50 %.

**Beispiel:** 2 mV/V × Gain 1.5 = 3 mV/V effektive Spanne.

### Brückenwiderstand / Brückenarme

Nennwiderstand eines einzelnen Brückenarms. Bei vier gleichen 10-kΩ-Armen beträgt der Gesamtwiderstand zwischen EXC+ und EXC− ebenfalls 10 kΩ.

**Beispiel:** Zwei Zweige mit je 20 kΩ liegen parallel: 20 kΩ ∥ 20 kΩ = 10 kΩ.

### Brückennullpunkt

Der Differenzausgang bei 0 % FS. Ein realistischer Sensor kann bereits bei 0 % Druck einen positiven oder negativen Offset aufweisen.

**Beispiel:** Nullpunkt = 0.2 mV/V bei 5 V Erregung entspricht 1 mV Ausgangsoffset.


## Kennlinie

### Hysterese

Unterschied zwischen Ausgangssignal bei steigender und fallender Druckbelastung am gleichen Druckpunkt. Hier als maximaler Unterschied in % der Vollhubspanne definiert, mit Maximum bei 50 % FS.

**Beispiel:** Bei 10 mV Vollhub und 0.1 % FS Hysterese beträgt die maximale Differenz von Auf- und Ab-Kennlinie 0.01 mV.

### Belastungsrichtung

Wählt die Aufwärts- oder Abwärtskennlinie für die Hysterese. Bei Hysterese 0 liefern beide Richtungen denselben Wert.

**Beispiel:** Wenn du einen Druckpunkt zuerst von unten und dann von oben anfährst, kann das Ausgangssignal geringfügig verschieden sein.

### Nichtlinearität

Abweichung der Sensor-Kennlinie von der idealen Geraden. Im aktuellen vereinfachten Modell wird eine quadratische Abweichung mit maximalem Betrag um 50 % FS benutzt.

**Beispiel:** 1 % FS bei 10 mV Vollhub entspricht maximal etwa 0.1 mV Abweichung.

### Drift

Langsame Änderung des Offsets durch Zeit, Alterung oder andere Einflüsse. In der aktuellen Simulation wird Drift als statischer Zusatzwert in µV behandelt.

**Beispiel:** Drift +20 µV erhöht das Differentialsignal um 0.02 mV.

### Kriechen

Zeitabhängige Veränderung des Ausgangssignals nach einer Belastung. Die Simulation verwendet ein vereinfachtes exponentielles Einschwingmodell.

**Beispiel:** Kriechen 0.2 % FS erreicht bei genügend langer Zeit asymptotisch 0.2 % der Vollhubspanne.

### Zeitkonstante des Kriechens

Gibt in Sekunden an, wie schnell sich der Kriechanteil seinem Endwert nähert. Nach einer Zeitkonstante sind im exponentiellen Modell rund 63 % des Endwerts erreicht.

**Beispiel:** Bei τ = 60 s erreicht das Modell nach 60 s rund 63 % seines maximalen Kriechanteils.

### Verstrichene Zeit

Die für das Kriechmodell angenommene Zeit seit dem Start einer Belastung. Die Software simuliert diesen Parameter momentan als frei eingegebene Zahl.

**Beispiel:** 0 s = noch kein Kriechanteil; 600 s = nahe dem Endwert bei einer Zeitkonstante von 60 s.


## Thermistor

### Temperaturwiderstand: PTC oder NTC

Die zusätzliche Temperaturwiderstands-Simulation kann deaktiviert sein oder als PTC bzw. NTC laufen. Sie beeinflusst im Modell den Speisestrom, nicht unmittelbar die differenzielle Brückenspannung.

**Beispiel:** PTC: R steigt typischerweise mit T; NTC: R sinkt typischerweise mit T. Hardwareansteuerung noch nicht implementiert.

### PTC R25

R25 ist der Widerstand bei der Referenztemperatur 25 °C. PTC bedeutet positiver Temperaturkoeffizient: der Widerstand steigt im hier verwendeten linearen Modell mit T.

**Beispiel:** R25 = 10'000 Ω, TK = 4000 ppm/K: bei 75 °C ergibt sich R = 12'000 Ω.

### PTC-Temperaturkoeffizient

Relativer Widerstandsanstieg pro Kelvin, im Modell ppm/K. Ein positiver Wert erhöht R bei steigender Temperatur.

**Beispiel:** 4000 ppm/K entsprechen +0.4 % pro K. Über 50 K sind es im linearen Modell +20 %.

### NTC R25 – Nennwiderstand bei 25 °C

R25 ist der Nennwiderstand des NTC bei 25 °C. NTC bedeutet negativer Temperaturkoeffizient: der Widerstand nimmt bei steigender Temperatur ab.

**Beispiel:** NTC R25 = 10'000 Ω: bei 25 °C hat er 10 kΩ; bei 75 °C mit B = 3950 K ungefähr 1.49 kΩ.

### NTC B-Wert (Beta)

Der B-Wert in Kelvin beschreibt die Temperaturabhängigkeit des NTC-Widerstands im vereinfachten Beta-Modell. Er ist keine Temperatur und kein Widerstand.

**Beispiel:** R(T) = R25 × exp[B × (1/T[K] − 1/298.15 K)]. Beispiel B = 3950 K.

### PTC – Positive Temperature Coefficient

Ein temperaturabhängiger Widerstand, dessen Widerstand mit steigender Temperatur normalerweise steigt. Der gewählte PTC ist im Emulator derzeit nur ein lineares Widerstandsmodell.

**Beispiel:** Die reale Kennlinie hängt vom Bauteil ab; besonders schaltende PTC-Typen sind nicht linear.

### NTC – Negative Temperature Coefficient

Ein temperaturabhängiger Widerstand, dessen Widerstand bei Erwärmung normalerweise sinkt. Viele NTC werden zur Temperaturmessung verwendet.

**Beispiel:** Ein typischer NTC: R25 10 kΩ, B3950. Der B-Wert beschreibt die Temperaturkurve.


## Einheiten

### Kelvin (K) und Grad Celsius

Kelvin ist die SI-Einheit der thermodynamischen Temperatur. Temperaturdifferenzen von 1 K und 1 °C sind gleich gross. Für das NTC-Beta-Modell muss die absolute Temperatur in Kelvin eingesetzt werden.

**Beispiel:** 25 °C = 298.15 K; 75 °C = 348.15 K.

### mV/V – Brückensensitivität

Millivolt Ausgangsspannung pro Volt Speisespannung. Dies ist die typische ratiometrische Einheit einer resistiven Vollbrücke.

**Beispiel:** 2 mV/V × 5 V = 10 mV.

### ppm/K

Parts per million pro Kelvin. 1000 ppm/K bedeuten eine relative Änderung von 0.1 % pro Kelvin.

**Beispiel:** 1000 ppm/K × 50 K = 50'000 ppm = 5 %.


## Software

### BLE und Web Bluetooth

BLE steht für Bluetooth Low Energy. Der Browser kann mit dem ESP32-C3 über GATT-Befehle kommunizieren, sofern der Benutzer eine Verbindung erlaubt.

**Beispiel:** Chrome und Edge mit HTTPS unterstützen Web Bluetooth, die Firmware muss zum Protokoll passen. Aktuell keine reale Analogausgabe.

### Firmwareupdate per USB

Der ESP32-C3 SuperMini wird über USB-C mit ESP Web Tools programmiert. Dabei können vorhandene Firmware und gespeicherte Daten überschrieben werden.

**Beispiel:** Immer die SensorBridge-Firmware für ESP32-C3 verwenden, niemals versehentlich die ELMOS-Adapterfirmware.

### Sensorprofil und Grenzwerte

Das Sensorprofil enthält die nominalen Kennwerte, erwartete Min-/Max-Werte und Prüfpunkte. Profile werden lokal im Browser oder als JSON-Datei gespeichert.

**Beispiel:** Mit Profilen kann später der Universal SSC Calibration Assistant die gleichen Sensoreinstellungen verwenden.


## Grundlagen

### Emulator und elektrische Simulation

Der SensorBridge Emulator soll ein Sensorsignal elektrisch nachbilden. Die aktuelle Webanwendung berechnet die Werte mathematisch; es wird noch kein physikalischer Druck oder validiertes Brückensignal erzeugt.

**Beispiel:** Um eine Kalibriersoftware damit zu testen, muss später die reale Analog-Hardware samt Rückmessung validiert werden.

---

Das interaktive Wiki ist direkt in der [SensorBridge-Weboberfläche](https://vadergit.github.io/SensorBridge-Emulator/#wiki) integriert.

## Schrittweite und Genauigkeit (v0.8)

Für die neuen Begriffe **RDAC**, **Auflösung**, **Quantisierung**, **Toleranz**, **Grob-/Mittel-/Feinabgleich** und **Temperaturschritte** siehe die erweiterten interaktiven Wiki-Artikel.

Alle allgemeinen Formeln, vollständige Zahlenbeispiele, AD5270-Einzelarmrechnungen, Modellgrenzen und Toleranzannahmen stehen auch in [Formeln, Schrittweiten und theoretische Auflösung](CALCULATIONS_AND_RESOLUTION.md).

**Hinweis:** Die feinste in einem Modell errechnete Schrittweite ist keine gemessene Ausgangstoleranz. Erst ein fertig aufgebautes und überprüftes Board ermöglicht eine Aussage über die reale Genauigkeit.
