# Konzept: GM Kampagnen-Suite fuer Fateweaver

## Ziel

Fateweaver soll fuer GMs eine vollwertige Kampagnen-, Vorbereitungs- und Live-Session-Suite bekommen. Der Fokus liegt nicht auf Charaktertracking, weil dieses bereits stark ist. Charaktere werden nur als angebundene Referenz genutzt.

Das GM-System soll sich funktional an drei Konzepten orientieren:

- Kanka: verknuepfte Welt- und Kampagnendatenbank.
- Heart of Daggers: Campaign Hub, Adventure Builder, GM Screen.
- Daggerbrain: Live-Sync, Encounter Tools, Tracker und Session-Dashboard.

Es soll nicht kopiert werden. Ziel ist ein eigenes, systemunabhaengiges GM-Modell fuer moeglichst viele TTRPG-Systeme.

## Produktprinzipien

- GM-first: Alle Funktionen muessen dem Spielleiter beim Vorbereiten und Leiten helfen.
- Systemunabhaengig: Keine festen DnD- oder Daggerheart-Annahmen im Kern.
- Verknuepft statt isoliert: Orte, NSC, Fraktionen, Quests, Szenen, Handouts und Gegner sollen miteinander verbunden werden koennen.
- Live-tauglich: In einer Session muss der GM schnell suchen, wechseln, freigeben, tracken und notieren koennen.
- Geheimnisse bleiben geheim: GM-Notizen, Spielertexte und Freigaben muessen sauber getrennt sein.
- Bestehende Charakterverwaltung bleibt Quelle, aber nicht Mittelpunkt des GM-Moduls.

## Zielstruktur

### 1. Kampagnen-Hub

Der Kampagnen-Hub ist die Startseite einer Kampagne.

Funktionen:

- Kampagnenbild, Name, Beschreibung, Genre/Ton, Spielsystem/Regelprofil.
- Status: geplant, aktiv, pausiert, abgeschlossen.
- Naechste Session mit Datum, Vorbereitung und Schnellstart.
- Beteiligte Charaktere als Referenz.
- Oeffentliche Spieler-Notizen.
- Private GM-Notizen.
- Offene Quests, aktive Fraktionen, wichtige Orte, aktive Bedrohungen.
- Letzte Ereignisse aus History/Timeline.
- Schnellaktionen: Session starten, Szene vorbereiten, Handout freigeben, Quest anlegen.

### 2. GM-Baukasten als verknuepfte Datenbank

Bestehende Custom GM Modules werden erweitert.

Eintragstypen:

- NSC
- Gegner
- Ort
- Fraktion
- Quest
- Szene
- Encounter
- Bedrohung
- Handout
- Regel/Hausregel
- Raetsel
- Notiz
- Item/Belohnung

Jeder Eintrag braucht:

- Name
- Typ
- Status: Entwurf, aktiv, erledigt, archiviert
- Sichtbarkeit: nur GM, fuer Spieler freigegeben
- Kurzbeschreibung
- GM-Notizen
- Spielertext
- Tags
- Kampagnen-/Session-/Szenen-Zuordnung
- Beziehungen zu anderen Eintraegen
- flexible Felder

Beziehungstypen:

- gehoert zu
- befindet sich in
- tritt auf in
- kontrolliert
- verbuendet mit
- feindlich mit
- Questgeber
- Ziel von Quest
- Geheimnis ueber
- fuehrt zu
- Konsequenz von

### 3. Abenteuer- und Session-Struktur

Die Struktur soll laenger laufende Kampagnen und einzelne One-Shots abdecken.

Hierarchie:

- Kampagne
- Arc/Kapitel
- Session
- Szene
- Module/Eintraege

Session-Felder:

- Name
- Datum
- Ziel der Session
- Vorbereitung
- aktive Szenen
- beteiligte Charaktere
- verknuepfte Orte, NSC, Fraktionen, Quests, Handouts, Encounter
- Live-Notizen
- Recap
- offene Fragen
- naechste Hooks

Szenen-Felder:

- Name
- Zweck/Ziel
- Einstieg
- Vorlesetext oder Spielertext
- GM-Notizen
- beteiligte NSC
- Ort
- Encounter/Gegner
- Handouts
- Geheimnisse
- moegliche Konsequenzen
- Status: vorbereitet, aktiv, abgeschlossen, uebersprungen

### 4. Live-Session-Dashboard

Das Dashboard soll waehrend der Session geoeffnet bleiben.

Layout:

- Kopfbereich: aktive Kampagne, aktive Session, aktive Szene, Session-Timer optional.
- Linke Spalte: Szenenliste, Agenda, Schnellnavigation.
- Mitte: aktive Szene mit GM-Text, Spielertext, verbundenen Modulen.
- Rechte Spalte: Tracker, Countdowns, Gegner, offene Anfragen, Freigaben.
- Unterer Bereich oder Tab: Log, History, Wuerfe, Inventar-/Shop-Ereignisse, Live-Notizen.

Aktionen:

- Szene starten/beenden.
- Handout oder Spielertext freigeben.
- Countdown/Clock erhoehen oder senken.
- Tracker-Wert aendern.
- Gegner/Encounter aktivieren.
- Notiz an Recap anhaengen.
- Queststatus aendern.
- Ereignis in Timeline schreiben.

### 5. Systemunabhaengige Tracker

Tracker werden nicht fest als Fear, Initiative oder Doom gebaut, sondern frei konfigurierbar.

Trackertypen:

- Ressource: Name, aktueller Wert, Maximum, sichtbar fuer Spieler.
- Countdown/Clock: Segmente, aktueller Fortschritt, Ausloeser, Konsequenz.
- Front/Bedrohung: Stufen, naechste Eskalation, beteiligte Fraktion.
- Initiative/Reihenfolge: optionales Modul fuer Systeme mit Runden.
- Szenenaspekt/Tag: kurze aktive Zustandsmarker.

Beispiele:

- Daggerheart: Fear, Countdowns.
- DnD: Initiative, Lair Actions, Legendary Actions.
- PbtA/FitD: Clocks, Fronts.
- Fate: Szenenaspekte, Fate Points.
- Eigenes System: frei benannte Ressourcen.

### 6. Freigaben und Spieleransicht

Spieler sollen nur freigegebene Inhalte sehen.

Funktionen:

- Spielertext getrennt von GM-Notizen.
- Handouts einzeln freigeben.
- Orte/Bibliotheken als Freigabe-Zentren.
- Sichtbarkeit pro Kampagne, Session, Charakter oder Gruppe.
- Preview: GM sieht, was Spieler sehen wuerden.
- Magic-Link/Einladung bleibt Kampagnenfunktion.

### 7. GM Screen

Der GM Screen ist eine frei konfigurierbare Live-Ansicht.

Funktionen:

- Mehrere Screen-Layouts.
- Section Library: Regeln, Tracker, NSC, Gegner, Notizen, Tabellen.
- Layout speichern und zuruecksetzen.
- Controls ausblenden.
- Optionaler Share/Player-Link fuer sichtbare Tracker.
- Regelreferenzen aus GM Verwaltung/Katalog einbinden.

### 8. Suche und Navigation

Mid-session muss alles schnell auffindbar sein.

Funktionen:

- globale GM-Suche.
- Filter nach Typ, Status, Tag, Kampagne, Session, Sichtbarkeit.
- Schnellzugriff auf zuletzt geoeffnete Eintraege.
- Mentions/Links in Textfeldern, z. B. @Ort, @NSC, @Quest.
- Ruecklinks: Eintrag zeigt, wo er verwendet wird.

## Umsetzungsvorschlag in Phasen

### Phase 1: Datenmodell und Kampagnen-Hub

- Campaign um Bild, Status, Systemprofil, Ton, Spielertext, GM-Notizen erweitern.
- CampaignSession um Ziel, Vorbereitung, Recap, Live-Notizen, offene Fragen erweitern.
- CustomGmModule um Szene und Beziehungen erweitern.
- Kampagnen-Hub UI bauen.

### Phase 2: Szenen und Abenteuerstruktur

- Arc/Kapitel optional einfuehren.
- Szenen als eigenen GM-Modultyp ausbauen.
- Session -> Szenen -> Module-Zuordnung bauen.
- Szene starten/beenden.

### Phase 3: Live-Session-Dashboard

- Aktive Kampagne/Session/Szene speichern.
- Live-Layout mit Szenenliste, Szene, Tracker, Gegnern, Log bauen.
- Live-Notizen und Recap-Workflow bauen.

### Phase 4: Tracker und Clocks

- generisches Tracker-Modell.
- Tracker-Editor in Vorbereitung.
- Tracker-Panel im Live-Dashboard.
- Spieler-sichtbare Tracker-Freigabe.

### Phase 5: Beziehungen, Suche, Mentions

- Relationship-Modell fuer Module.
- Relation-UI in Eintraegen.
- globale GM-Suche.
- Mention-Verlinkung in Textfeldern.

### Phase 6: GM Screen und Politur

- konfigurierbare Screen-Sektionen.
- mehrere gespeicherte Layouts.
- Regelreferenzen, Tracker, aktive Szene, Gegner einbindbar.
- responsives, kompaktes Live-Design pruefen.

## ClickUp Parent Task

Titel:
GM Kampagnen-Suite: Kampagnen-Hub, Vorbereitung und Live-Session-Dashboard

Status:
to do

Liste:
Sprint

Beschreibung:
Als GM moechte ich Kampagnen systemunabhaengig planen, strukturieren und live am Spieltisch leiten koennen. Charaktertracking bleibt nicht Fokus dieser Aufgabe; vorhandene Charaktere werden nur angebunden. Die Suite soll Kampagnen-Hub, verknuepfte GM-Datenbank, Abenteuer-/Session-Struktur, Live-Dashboard, Tracker, Freigaben, Suche und GM Screen abdecken.

## ClickUp Subtasks

1. Datenmodell fuer GM Kampagnen-Suite erweitern
2. Kampagnen-Hub UI konzipieren und bauen
3. GM-Baukasten um Szenen und Beziehungen erweitern
4. Abenteuerstruktur mit Arc/Kapitel/Session/Szene umsetzen
5. Live-Session-Dashboard bauen
6. Generische Tracker und Countdowns umsetzen
7. Freigabe- und Spieler-Preview verbessern
8. Globale GM-Suche und Mentions umsetzen
9. GM Screen als konfigurierbare Live-Ansicht bauen
10. Migration, Tests und QA fuer bestehende GM-Daten

