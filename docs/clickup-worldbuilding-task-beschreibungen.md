# ClickUp-Beschreibungen: Worldbuilding & Campaign Builder

Grundlage: LegendKeeper Overview/Tutorial, Fantasy Timeline, Map Pins, Worldbuilding-Kurzvideo und Campaign-Workflow. Ziel ist nicht, LegendKeeper zu kopieren, sondern die gezeigten Kernmuster fuer Fateweaver nutzbar zu machen: verlinkte Wiki-Seiten, Kartenpins, Timelines, Boards, Templates und sichere GM-/Spieler-Sichtbarkeit.

## Epic 1: Unified Worldbuilding Core

### Gemeinsames Entity-Modell definieren
Beschreibung: Zentrales Datenmodell fuer alle Worldbuilding-Objekte definieren, damit Wiki, Karten, Timelines, Boards, Templates und Secrets nicht getrennt voneinander entstehen. Jede Entitaet muss eindeutig referenzierbar sein und mit Lore-Seiten, Tags, Sichtbarkeit und Beziehungen verbunden werden koennen.

- Page: Wiki-Seite als zentrale Lore-Referenz fuer Orte, NSC, Fraktionen, Quests, Items, Regeln und Notizen modellieren.
- Map: Karte als eigenes Objekt mit Bild, Metadaten, Pins und Verknuepfung zu Kampagne oder Wiki-Seite modellieren.
- MapPin: Pin mit Position, Label, optionaler Wiki-Verknuepfung, Icon, Sichtbarkeit und eigener Beschreibung modellieren.
- Timeline: Zeitstrahl als Container fuer Ereignisse, Kalenderregeln, Filter und Storylines modellieren.
- TimelineEvent: Ereignis mit Zeitpunkt oder Zeitraum, Beschreibung, Tags und optionaler Wiki-Verknuepfung modellieren.
- Board: Visuelles Planungsboard als Canvas fuer Questflows, Beziehungen, Notizen und Bilder modellieren.
- BoardCard: Karte auf einem Board als eigenstaendige Notiz oder verlinkte Wiki-/Lore-Referenz modellieren.
- Template: Wiederverwendbare Vorlagen fuer Seiten, Boards, Sessions und typische Worldbuilding-Typen modellieren.
- Secret: Geheimen Inhalt als eigenstaendige Einheit modellieren, die an Seiten, Pins, Events oder Cards haengen kann.
- VisibilityRule modellieren: Einheitliche Regeln fuer GM-only, player-visible, versteckte Bereiche und Freigaben definieren.

### Globales Linking-System bauen
Beschreibung: Ein gemeinsames Link-System bauen, das in Editor, Karten, Timelines und Boards gleich funktioniert. Nutzer sollen Lore-Objekte schnell finden, verlinken, neu anlegen und spaeter ueber Backlinks wiederfinden koennen.

- Interne Links: Verlinkungen zwischen Wiki-Seiten und anderen Worldbuilding-Objekten speichern und im UI oeffnen.
- Backlinks: Auf jeder Seite anzeigen, welche Pins, Events, Boards oder Seiten darauf verweisen.
- @-Mentions: Beim Tippen von @ passende Seiten oder Entities vorschlagen und direkt einfuegen.
- Link-Picker: Einheitlichen Suchdialog fuer Seiten, Karten, Events, Boards und Templates bereitstellen.
- Broken-Link-State: Geloeschte oder verschobene Ziele als kaputte Links markieren und reparierbar machen.

## Epic 2: Wiki & Editor verbessern

### Rich Wiki Pages
Beschreibung: Wiki-Seiten zu vollwertigen Worldbuilding-Seiten ausbauen. Seiten sollen hierarchisch organisiert, mit Bildern und Eigenschaften versehen, getaggt und schnell durchsucht werden koennen.

- Seitenbaum: Kampagnen-Wiki als navigierbare Baumstruktur mit Seiten und Unterseiten darstellen.
- Drag-and-drop-Nesting: Seiten per Drag-and-drop verschieben und als Unterseiten anderer Seiten einsortieren.
- Tags: Seiten mit frei definierbaren Tags versehen und danach filtern oder suchen.
- Featured Image: Pro Seite ein Titelbild setzen, das in Vorschauen, Cards und Suchergebnissen erscheint.
- Properties: Strukturierte Felder wie Typ, Status, Region, Fraktion oder Schwierigkeit pro Seite pflegen.

### Rapid Creation
Beschreibung: Neue Lore-Seiten direkt aus dem Schreibfluss heraus erstellen. Der GM soll waehrend Vorbereitung oder Session nicht aus dem Kontext gerissen werden, wenn spontan ein Ort, NSC oder Begriff entsteht.

- Create Page modal: Schnelles Modal fuer Name, Typ, Parent-Seite, Tags und optionale Vorlage bauen.
- @-Mention erstellt neue Seite: Wenn ein Mention-Ziel fehlt, kann daraus sofort eine neue verlinkte Seite entstehen.
- Cut-to-New-Page: Markierten Text in eine neue Seite auslagern und an der alten Stelle automatisch verlinken.
- Slash Commands: Editor-Befehle fuer Seitenlink, Infobox, Secret Block, Tabelle, Callout und Template einfuehren.

### Auto-Linking
Beschreibung: Bestehende Texte automatisch nach bekannten Seitennamen durchsuchen und Link-Vorschlaege anbieten. Der GM entscheidet kontrolliert, welche Treffer wirklich zu Links werden.

- Seitennamen im Text erkennen: Begriffe im Editor mit bestehenden Seiten- und Entity-Namen abgleichen.
- Vorschau: Vor dem Anwenden zeigen, welche Begriffe auf welche Seiten verlinkt wuerden.
- Bulk-Apply: Mehrere sichere Link-Vorschlaege gesammelt anwenden.
- Ignore-Liste: Begriffe oder Treffer dauerhaft ignorieren, wenn sie nicht als Lore-Link gemeint sind.

## Epic 3: Interactive Maps

### Karten-Upload und Viewer
Beschreibung: Karten als zentrale Navigations- und Lore-Oberflaeche nutzbar machen. Grosse Welt-, Regions- oder Dungeonbilder sollen fluessig angezeigt, gezoomt und mit Worldbuilding-Daten verbunden werden.

- Zoom/Pan: Karte per Maus, Touchpad und Touch fluessig bewegen und zoomen.
- Grosse Bilder: Sehr grosse Karten performant laden, anzeigen und bei Bedarf gekachelt oder optimiert rendern.
- Asset-Auswahl: Kartenbild aus Uploads oder Asset-Bibliothek auswaehlen und austauschen.
- Map-Metadaten: Name, Beschreibung, Massstab, Region, Kampagne, Tags und Sichtbarkeit der Karte speichern.

### Map Pins
Beschreibung: Kartenpins als Verbindung zwischen visueller Weltkarte und Wiki-Lore bauen. Pins sollen schnell gesetzt, bearbeitet und optional mit Seiten verbunden werden koennen.

- Pin per Rechtsklick: An Kartenposition per Kontextmenue einen neuen Pin erstellen.
- Pin per Drag-and-drop einer Wiki-Seite: Wiki-Seite auf die Karte ziehen und daraus einen verlinkten Pin erzeugen.
- Pin-Editor: Label, Beschreibung, Wiki-Link, Icon, Farbe, Tags und Sichtbarkeit des Pins bearbeiten.

### Pin Styling & Visibility
Beschreibung: Pins optisch unterscheidbar und kontrolliert sichtbar machen. GM-only Pins, Spielerpins, Typen und Filter muessen im selben Kartenbild parallel funktionieren.

- Icon: Pin-Typen mit passenden Symbolen wie Ort, Stadt, Dungeon, NSC, Quest oder Gefahr kennzeichnen.
- Farbe: Pins farblich nach Typ, Status, Fraktion oder Wichtigkeit unterscheiden.
- Border: Hervorhebungen fuer aktive, geheime, gefaehrliche oder relevante Pins setzen.
- Tags: Pins taggen und ueber Kartenfilter ein- oder ausblenden.
- Spieler-sichtbar/GM-only: Pro Pin festlegen, ob Spieler ihn sehen duerfen oder er nur fuer den GM sichtbar ist.

### Nested Maps
Beschreibung: Karten hierarchisch verbinden, damit Weltkarte, Region, Stadt, Gebaeude und Dungeon ohne Kontextverlust navigierbar sind.

- Pin/Region kann auf Unterkarte verweisen: Pin oder markierter Bereich oeffnet eine detailliertere Karte.
- Breadcrumbs: Aktuellen Kartenpfad anzeigen, z. B. Welt > Region > Stadt > Dungeon.
- Return Navigation: Schnell zur uebergeordneten Karte oder letzten Position zurueckkehren.

## Epic 4: Timelines

### Timeline-Datenmodell
Beschreibung: Zeitereignisse als verlinkbare Lore-Daten modellieren. Ereignisse muessen einmal gepflegt und dann in Listen-, Gantt- und Kalenderansicht korrekt dargestellt werden.

- Events: Einzelne Ereignisse mit Titel, Beschreibung, Status, Quelle und Kampagnenbezug speichern.
- Dauer: Ereignisse koennen eine Laenge haben, z. B. Krieg, Reise, Herrschaft oder Ritual.
- Start/Ende: Start- und Endzeit getrennt speichern, damit Zeitpunkt und Zeitraum moeglich sind.
- Praezision: Unscharfe Angaben wie Jahr, Monat, Tag oder unbekannt abbilden.
- Wiki-Link: Ereignisse mit Seiten wie NSC, Ort, Fraktion oder Quest verknuepfen.
- Tags: Ereignisse nach Arc, Region, Fraktion, Geheimnis oder Storyline filterbar machen.

### Drei Ansichten bauen
Beschreibung: Dieselben Timeline-Daten in drei Denkweisen anzeigen: chronologische Geschichte, Planungsuebersicht und Kalenderlogik.

- Chronicle/List: Ereignisse als chronologische Liste mit Filtern, Gruppierung und schnellen Details anzeigen.
- Gantt: Zeitraeume und parallele Entwicklungen als Balken sichtbar machen.
- Calendar: Ereignisse in einem Kalenderlayout anzeigen, das zum Kampagnenkalender passt.

### Fantasy Calendar
Beschreibung: Eigene Kampagnenkalender unterstuetzen, weil Fantasy-Welten oft andere Monate, Wochen, Jahreslaengen oder Epochen nutzen.

- Monate: Eigene Monatsnamen, Reihenfolge und Tagesanzahl definieren.
- Wochentage: Eigene Wochentage und Wochenlaengen speichern.
- Jahreslaengen: Abweichende Jahreslaengen, Schaltregeln oder einfache fixe Jahre abbilden.
- Era-System: Zeitalter, Aeren oder Kalendernullpunkte fuer historische Ereignisse definieren.
- Validierung: Unmoegliche Datumswerte verhindern und Nutzern klare Fehler anzeigen.

### Timeline Linking
Beschreibung: Mehrere Zeitstraenge vergleichbar machen, damit politische, persoenliche und regionale Entwicklungen gemeinsam analysiert werden koennen.

- Mehrere Timelines vergleichen: Zwei oder mehr Timelines in einer gemeinsamen Ansicht ueberlagern.
- Filter: Nach Tags, Fraktionen, Regionen, Geheimnissen oder Storyline filtern.
- Parallele Storylines: Gleichzeitig laufende Handlungen sichtbar nebeneinander darstellen.

## Epic 5: Boards / Visual Planning

### Infinite Board Canvas
Beschreibung: Freies Planungsboard fuer visuelle Vorbereitung bauen. GMs sollen Questflows, Beziehungsnetze, Hinweise, Fraktionen und Szenen als flexible Canvas planen koennen.

- Pan/Zoom: Canvas fluessig bewegen und zoomen, ohne Layout zu verlieren.
- Notes: Freie Notizzettel fuer Ideen, Hinweise, Szenen oder offene Fragen anlegen.
- Images: Bilder, Kartenabschnitte, Portraits oder Handouts auf dem Board platzieren.
- Cards: Strukturierte Karten fuer Quests, NSC, Orte oder Szenen erstellen.
- Connectors: Karten und Notizen mit Linien verbinden und Beziehungen sichtbar machen.

### Page Cards
Beschreibung: Boards mit der Lore-Datenbank verbinden. Eine Karte auf dem Board soll nicht nur Text sein, sondern eine Vorschau auf echte Wiki-Daten oeffnen koennen.

- Wiki-Seite als Karte einfuegen: Bestehende Seite als Board Card platzieren.
- Vorschau: Titel, Typ, Bild, Kurzbeschreibung und Status der verknuepften Seite anzeigen.
- Klick oeffnet Seite: Klick auf die Card oeffnet die Originalseite oder ein Detailpanel.

### Board Templates
Beschreibung: Wiederverwendbare Board-Vorlagen fuer typische GM-Planung bereitstellen. Neue Boards sollen nicht leer starten muessen.

- Family Tree: Vorlage fuer Abstammung, Beziehungen und Familienkonflikte bereitstellen.
- Quest Flow: Vorlage fuer Questgeber, Ziele, Hinweise, Hindernisse und Konsequenzen bereitstellen.
- Conspiracy Board: Vorlage fuer Hinweise, Verdachtsmomente, Fraktionen und geheime Verbindungen bereitstellen.
- GM Screen Layout: Board-Layout fuer schnell erreichbare Sessioninfos und Referenzen vorbereiten.

## Epic 6: Templates & GM Bible

### Template-System erweitern
Beschreibung: Vorlagen fuer wiederkehrende Worldbuilding- und Session-Inhalte ausbauen. GMs sollen strukturierte Seiten und Boards schnell anlegen koennen, ohne jedes Mal Felder neu zu erfinden.

- Seitentemplates: Vorlagen fuer Seiten mit Abschnitten, Properties und Platzhaltern erstellen.
- Boardtemplates: Vorlagen fuer visuelle Planungsboards speichern und wiederverwenden.
- Sessiontemplates: Session-Vorlagen fuer Ziel, Vorbereitung, Szenen, Recap und offene Fragen erstellen.
- NPC/Ort/Fraktion: Spezielle Vorlagen fuer zentrale Lore-Typen mit passenden Feldern liefern.

### GM Bible Import/Starter Pack
Beschreibung: Ein importierbares Kampagnen-Grundgeruest bereitstellen. Neue GMs sollen mit einer brauchbaren Struktur fuer Kampagne, Lore, Maps, Sessions und Templates starten koennen.

- Beispielstruktur: Standardordner und Beispielseiten fuer Kampagne, Orte, NSC, Fraktionen, Quests und Sessions erzeugen.
- GM Screen: Beispiel-GM-Screen mit Schnelllinks, Notizen, Regeln und Sessionbereich anlegen.
- Compendium: Grundstruktur fuer Regeln, Hausregeln, Tabellen und Referenzen anlegen.
- Maps: Beispielbereich fuer Welt-, Regions- und Dungeonkarten vorbereiten.
- Sessions: Session-Ordner mit Startvorlagen fuer Vorbereitung, Live-Notizen und Recap anlegen.
- Templates: Alle Starter-Vorlagen gebuendelt importierbar machen.

### Digital GM Screen
Beschreibung: Konfigurierbare Live-Ansicht fuer die Session bauen. Die wichtigsten Informationen sollen waehrend des Spiels erreichbar sein, ohne durch Wiki, Maps und Listen navigieren zu muessen.

- Frei konfigurierbare Panels: Panels fuer Regeln, Tracker, Szene, Notizen, NSC oder Links frei anordnen.
- Schnelllinks: Wichtige Seiten, Karten, Timelines und Boards direkt oeffnen.
- Notizen: Schnelle Live-Notizen erfassen und spaeter in Recap oder Timeline uebernehmen.
- Regeln: Regelreferenzen, Hausregeln oder Tabellen kompakt im Screen anzeigen.
- Aktive Session: Aktuelle Session, Szene, Agenda und relevante Module im Screen sichtbar machen.

## Epic 7: Permissions, Secrets, Sharing

### Visibility Layer
Beschreibung: Einheitliche Sichtbarkeitslogik fuer alle Inhalte bauen. GMs muessen geheime und freigegebene Inhalte auf derselben Seite, Karte oder Timeline sicher trennen koennen.

- GM-only: Inhalt nur fuer den GM sichtbar machen und eindeutig kennzeichnen.
- Player-visible: Inhalt gezielt fuer Spieler freigeben und in Spieleransichten anzeigen.
- Secret Block: Geheime Textbloecke innerhalb einer sonst sichtbaren Seite verwalten.
- Hidden Pin: Kartenpins verstecken, bis sie freigegeben oder entdeckt werden.
- Shared Link: Freigegebene Inhalte ueber Link oder Kampagnenzugriff teilen.

### Player View
Beschreibung: Sichere Vorschau der Spielerperspektive bauen. Der GM soll vor einer Freigabe sehen, welche Seiten, Pins, Events und Secrets Spieler wirklich sehen.

- Vorschau als Spieler: Aktuelle Kampagne aus Sicht eines Spielers oder einer Gruppe anzeigen.
- Freigabepruefung: Vor dem Teilen warnen, wenn GM-only Inhalte, geheime Pins oder Secret Blocks sichtbar waeren.
- Share-Link: Freigegebene Inhalte als stabilen Link teilen, ohne private GM-Daten offenzulegen.
