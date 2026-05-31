# Fateweaver App

React/Vite MVP fuer Charakterbogen, Charaktererstellung, Level-up, Rast und GM-Datenpflege.

## Entwicklung

1. `npm install`
2. Optional `.env` aus `.env.example` anlegen und Supabase Werte eintragen.
3. `supabase-schema.sql` im Supabase SQL Editor ausfuehren.
4. `npm run dev`

Ohne Supabase-Konfiguration laeuft die App lokal mit IndexedDB Cache und Seed-Daten.

## Projektregel

Alle Quellcodedateien bleiben unter 600 Zeilen. Wenn ein Bereich groesser wird, wird er nach Verantwortung gesplittet, ohne Kommentare, Leerzeilen oder Formatierung zu entfernen.
