# Vorläufige Beschaffung und Kosten

**Keine Live-Offerte:** Die bisherige Planung der Rev-B/C-Entwürfe lag bei rund **USD 100 Material pro Prototyp** (ohne PCB, Bestückung, Porto, Steuern, Ausschuss und Messtechnik). Dieser Betrag ist ein früher Richtwert und **nicht** durch eine aktuelle LCSC-/JLCPCB-Preisabfrage verifiziert.

## Hauptkostenblöcke (nur Richtwerte)

| Gruppe | Anzahl | Preisannahme |
|---|---:|---:|
| AD5270-100k | 8 | ~USD 48 |
| AD5270-20k | 1 | ~USD 7 |
| ESP32-C3 SuperMini module | 1 | ~USD 4 (separate sourcing) |
| Isolation, isolated power/regulation, relay | several | ~USD 18–25 |
| Precision resistor network, passives, Kelvin/test connectors | many | ~USD 20–40 |

**Reality check:** Several small-footprint precision resistors, the isolated supply, connector and test point selections, and the exact SPI isolator still need formal LCSC validation. A professional laboratory calibration and development iterations may cost more than the board components.

## Purchasing workflow

1. Open [BOM.csv](BOM.csv); verify each manufacturer's order code and LCSC item number directly at LCSC.
2. Confirm the item's symbol, pad numbering and actual EasyEDA **Pro** footprint are linked in the library.
3. Confirm JLCPCB assembly availability or mark components for hand assembly.
4. Run ERC, manual pin-number audit and power sequencing checks before PCB conversion.
5. Get a current LCSC quote and a JLCPCB PCBA quote, then update actual prices in the BOM.

**Do not order** on the basis of previous Rev-C0/C3 EasyEDA JSON imports: PCB conversion previously failed due to missing actual footprint links.
