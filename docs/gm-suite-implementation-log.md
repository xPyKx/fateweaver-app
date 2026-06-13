# GM Suite Implementation Log

## 2026-06-09 - Datenmodell Start

Aktiver ClickUp-Subtask:
Datenmodell fuer GM Kampagnen-Suite erweitern (`869dm4y7f`)

Ziel dieses Abschnitts:

- Bestehende Kampagnen-, Session- und GM-Modul-Daten kompatibel erweitern.
- Noch keine UI-Umstellung.
- Bestehende Daten muessen weiter normalisiert und gespeichert werden.

Technischer Befund:

- `Campaign` und `CampaignSession` liegen in `src/types/domain.ts`.
- Kampagnen und Sessions werden lokal im App-State und remote in eigenen Supabase-Tabellen gespeichert.
- `CustomGmModule` liegt aktuell im JSON-State und ist bereits fuer NPCs, Gegner, Orte, Fraktionen, Quests, Handouts usw. vorbereitet.
- Store-Normalisierung passiert in `normalizeLoadedData`, `cleanCampaigns`, `cleanCampaignSessions`, `cleanCustomGmModules`.
- Supabase-Mapping fuer Kampagnen/Sessions passiert in `src/lib/supabase/client.ts`.

Naechster konkreter Schritt:

- Typen fuer Campaign, CampaignSession, CustomGmModule, Beziehungen und Tracker ergaenzen.
- Normalisierungsfunktionen mit Defaultwerten erweitern.
- Supabase-Schema und Mapping fuer neue Campaign/Session-Felder kompatibel erweitern.

Erledigt in diesem Abschnitt:

- `Campaign` um Status, Bild, Systemprofil, Spieler-/GM-Notizen und Next-Session-Referenz erweitert.
- `CampaignSession` um Status, Ziel, Vorbereitung, Live-Notizen, Recap, offene Fragen, Hooks und Szenenreferenzen erweitert.
- `CustomGmModule` um `scene`, `sceneId`, `relations`, Modultyp `scene` und Modultyp `reward` erweitert.
- Generisches `GmTracker`-Modell fuer Ressourcen, Clocks, Fronts, Initiative und Tags angelegt.
- Store-Normalisierung fuer neue Campaign-, Session-, Module- und Tracker-Felder ergaenzt.
- Store-Aktionen `upsertGmTracker` und `deleteGmTracker` angelegt.
- Supabase-Schema und Campaign/Session-Mapping fuer neue Felder erweitert.
- `npm run build` erfolgreich ausgefuehrt.

Offen fuer den naechsten Abschnitt:

- Subtask "Kampagnen-Hub UI konzipieren und bauen" starten.
- UI fuer die neuen Campaign-Felder bauen.
- Bestehende GM-Vorbereitung so umbauen, dass Kampagnen-Hub, Sessions und Szenen klarer sichtbar werden.

## 2026-06-09 - Kampagnen-Hub UI

Aktiver ClickUp-Subtask:
Kampagnen-Hub UI konzipieren und bauen (`869dm4y7z`)

Erledigt in diesem Abschnitt:

- Bestehendes `CampaignModule` in der GM-Vorbereitung zum Kampagnen-Hub erweitert.
- Kampagnenstatus, Systemprofil, Genre, Ton, Kampagnenbild, Beschreibung, Spieler-Notizen und GM-Notizen editierbar gemacht.
- Hub-Kennzahlen fuer Sessions, Szenen, Quests, Orte, Fraktionen und Bedrohungen eingebaut.
- Naechste Session im Hub sichtbar gemacht und manuell setzbar gemacht.
- Sessionkarten um Status, Ziel, Vorbereitung, Live-Notizen, Recap, Hooks, Szenenliste und aktive Szene erweitert.
- Szenen koennen direkt aus dem Kampagnen-Hub erstellt und optional einer Session zugeordnet werden.
- GM-Baukasten-Typen um `scene` und `reward` erweitert.
- `npm run build` erfolgreich ausgefuehrt.

Hinweis:

- `git status` zeigt weitere bestehende Aenderungen in mehreren Dateien. Diese wurden nicht zurueckgesetzt.
- In `GMSessionView.jsx` existieren bereits andere Aenderungen am Gegnerbereich; der aktuelle Abschnitt hat den Kampagnen-Hub und die Build-Korrekturen beruehrt.

Naechster konkreter Schritt:

- Subtask "GM-Baukasten um Szenen und Beziehungen erweitern" starten.
- Szene im Baukasten als eigener Editor mit Zweck, Einstieg, Vorlesetext, Geheimnissen, Konsequenzen und Relationen ausbauen.

## 2026-06-09 - Szenen und Beziehungen im GM-Baukasten

Aktiver ClickUp-Subtask:
GM-Baukasten um Szenen und Beziehungen erweitern (`869dm4y8w`)

Erledigt in diesem Abschnitt:

- GM-Baukasten kann Module jetzt auch auf eine Szene scopen.
- Neue Bausteine vom Typ `scene` bekommen direkt eine Szenenstruktur.
- Szene-Editor im Custom Module Editor angelegt:
  - Zweck / Ziel
  - Einstieg
  - Vorlesetext
  - Geheimnisse
  - moegliche Konsequenzen
  - Ort
  - verknuepfte NSC
  - verknuepfte Gegner / Bedrohungen
  - verknuepfte Encounter
  - verknuepfte Handouts
- Relations-Editor fuer alle GM-Bausteine angelegt:
  - Beziehungstyp
  - Ziel-Baustein
  - optionale Notiz
  - GM-private Markierung
- Zielanzeige kennt jetzt `scene`-Scope.
- Szenen und Relationen werden beim Duplizieren/Vorlagen-Kopieren mitkopiert.
- `npm run build` erfolgreich ausgefuehrt.
- Devserver laeuft und antwortet auf `http://127.0.0.1:5173` mit HTTP 200.

Naechster konkreter Schritt:

- Subtask "Abenteuerstruktur mit Arc/Kapitel/Session/Szene umsetzen" starten.
- Entscheiden, ob Arc/Kapitel als eigener Typ oder als optionale Session-/Szenen-Gruppierung umgesetzt wird.

## 2026-06-09 - Abenteuerstruktur

Aktiver ClickUp-Subtask:
Abenteuerstruktur mit Arc/Kapitel/Session/Szene umsetzen (`869dm4y94`)

Entscheidung:

- `arc` und `chapter` werden als GM-Bausteintypen umgesetzt, nicht als eigene Tabelle.
- Sessions erhalten optionale `arcId` und `chapterId`.
- Kapitel koennen ueber eine Relation `belongsTo` einem Arc zugeordnet werden.

Erledigt in diesem Abschnitt:

- `GmBuilderItemType` um `arc` und `chapter` erweitert.
- `CampaignSession` um `arcId` und `chapterId` erweitert.
- Store-Normalisierung fuer Session-Zuordnung erweitert.
- Supabase-Schema und Mapping um `arc_id` und `chapter_id` erweitert.
- GM-Baukasten-Typen fuer Arc/Kapitel sichtbar gemacht.
- Kampagnen-Hub um Sektion "Abenteuerstruktur" erweitert.
- Arcs und Kapitel koennen direkt im Kampagnen-Hub erstellt werden.
- Sessionkarten koennen Arc und Kapitel zugeordnet werden.
- Strukturansicht zeigt Arc -> Kapitel -> Sessions -> Szenen.
- `npm run build` erfolgreich ausgefuehrt.
- Devserver laeuft und antwortet auf `http://127.0.0.1:5173` mit HTTP 200.

Naechster konkreter Schritt:

- Subtask "Live-Session-Dashboard bauen" starten.
- Aktive Kampagne, aktive Session und aktive Szene aus den neuen Strukturen ableiten und live nutzbar machen.

## 2026-06-09 - Live-Session-Dashboard

Aktiver ClickUp-Subtask:
Live-Session-Dashboard bauen (`869dm4y9j`)

Erledigt in diesem Abschnitt:

- GM Dashboard startet jetzt mit einem neuen `Live`-Modul.
- Live-Kontext wird aus aktiver/nächster Kampagne, aktiver/nächster Session und aktiver Szene abgeleitet.
- Live-Modul bietet Auswahl fuer Kampagne und Session.
- Session kann im Live-Modul gestartet oder abgeschlossen werden.
- Aktive Szene kann aus der Agenda gesetzt werden.
- Beim Aktivieren einer Szene wird auch der Szenenstatus auf `active` gesetzt.
- Live-Ansicht zeigt:
  - Arc/Kapitel/Session-Status
  - aktive Szene
  - Einstieg
  - Vorlesetext
  - GM-Notizen
  - Geheimnisse
  - Konsequenzen
  - verknuepfte Gegner, Handouts, NSC und Encounter
  - Live-Notizen
  - offene Fragen
- Verknuepfte Inhalte werden aus Szenenfeldern und Relationen zusammengefuehrt.
- `npm run build` erfolgreich ausgefuehrt.
- Devserver laeuft und antwortet auf `http://127.0.0.1:5173` mit HTTP 200.

Naechster konkreter Schritt:

- Subtask "Generische Tracker und Countdowns umsetzen" starten.
- Das bestehende `gmTrackers`-Modell als Vorbereitung/Live-UI nutzbar machen.

## 2026-06-09 - GM-Vorbereitung Informationsarchitektur

Ausloeser:

- Die GM-Vorbereitung war unklar, weil `Baukaesten` und `Baukasten` gleichzeitig sichtbar waren.
- Kampagnen-Freitext, Sessionplanung, Weltinhalte und Regelkonfiguration waren nicht klar getrennt.

Erledigt in diesem Abschnitt:

- GM-Vorbereitung nach Arbeitsphasen gruppiert:
  - `1. Kampagne planen`
  - `2. Inhalte vorbereiten`
  - `3. System konfigurieren`
- `Baukaesten` in `Regelwerk` umbenannt.
- `Baukasten` in `Welt & Inhalte` umbenannt.
- `Kampagne` in `Kampagne & Sessions` umbenannt.
- `Handouts` bleibt als Navigationsbegriff erhalten, weil der GM dort Inhalte vorbereitet, die spaeter an Spieler gegeben werden.
- `Layouts` in `Bogen & Layouts` umbenannt.
- Uebersichtskarten und Arbeitsfluss-Texte an die neue Struktur angepasst.
- Kampagnenfelder eindeutiger benannt:
  - `Kampagnen-Freitext`
  - `Kampagnen-Text fuer Spieler`
  - `Private Kampagnen-Notizen`
- `npm run build` erfolgreich ausgefuehrt.
- Devserver laeuft und antwortet auf `http://127.0.0.1:5173` mit HTTP 200.

## 2026-06-09 - Kampagnen & Sessions als Master-Detail

Ausloeser:

- Die Kampagnenansicht wurde zu lang, weil Kampagnendaten, Struktur, Session-Erstellung und alle Session-Editoren gleichzeitig untereinander gerendert wurden.
- Der GM brauchte links einen roten Faden: Kampagne auswaehlen, darunter eingerueckte Sessions oeffnen.

Erledigt in diesem Abschnitt:

- Linke Spalte in einen Kampagnenbaum umgebaut:
  - Kampagnen als Hauptpunkte.
  - Sessions eingerueckt unter der jeweiligen Kampagne.
  - Sessionanzahl direkt an der Kampagne sichtbar.
- Rechte Detailflaeche getrennt:
  - Klick auf Kampagne zeigt Kampagnen-Freitext, Spielertext, private Notizen, Abenteuerstruktur, Charakterzuordnung, Szenen- und Session-Erstellung.
  - Klick auf Session zeigt nur diese eine Session mit Ziel, Vorbereitung, Live-Notizen, Recap, Hooks, Szenen, Charakteren und Shops.
- Neu erstellte Sessions werden direkt geoeffnet, damit der GM sofort weiterschreiben kann.
- `Handouts` im UI wieder als Hauptbegriff gesetzt; Freigabe bleibt nur als Aktion/Konzept erhalten.
- `npm run build` erfolgreich ausgefuehrt.
- Devserver laeuft und antwortet auf `http://127.0.0.1:5173` mit HTTP 200.

## 2026-06-09 - Session-Freitext ohne Szenenpflicht

Ausloeser:

- Sessions duerfen nicht davon abhaengen, dass eine Szene existiert.
- Szenen sind optionale Bausteine fuer konkrete Ereignisse, Begegnungen oder Orte.
- Der GM braucht pro Session eigenen Freitext/Ablauf und GM-Notizen, die auch live sichtbar sind.

Erledigt in diesem Abschnitt:

- Session-Editor erweitert:
  - `Session-Freitext / Ablauf`
  - `Vorbereitung / GM-Plan`
  - `GM-Notizen live`
  - `Recap`
  - `Naechste Hooks`
- Szenenbereich im Session-Editor zu `Szenen optional` umbenannt.
- Live-Dashboard zeigt zuerst den Session-Freitext mit Ziel, Ablauf, Vorbereitung, GM-Notizen und Hooks.
- Szenen werden in der Live-Ansicht als optionaler Zusatzbereich angezeigt.
- Wenn keine Szene ausgewaehlt ist, kann die Session trotzdem ueber Freitext und GM-Notizen geleitet werden.
- `npm run build` erfolgreich ausgefuehrt.

## 2026-06-09 - Szenen an Sessions ansiedeln

Ausloeser:

- Szenen passieren in einer konkreten Session und sollen deshalb nicht im Kampagnen-Hub erstellt werden.
- Die Kampagne bleibt fuer uebergeordnete Informationen, Struktur und Session-Erstellung zustaendig.

Erledigt in diesem Abschnitt:

- Szenenerstellung aus der Kampagnen-Detailansicht entfernt.
- Szenenerstellung in die Session-Detailansicht verschoben.
- Neue Szenen werden immer mit `scope: session` und `sessionId` der geoeffneten Session erstellt.
- Die neue Szene wird direkt an `sceneIds` der Session angehaengt.
- `npm run build` erfolgreich ausgefuehrt.
