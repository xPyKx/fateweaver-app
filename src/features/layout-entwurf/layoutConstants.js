import { BookOpen, Feather, Package, Sparkles, Wand2, Gem, Star, Swords } from "lucide-react";

export const ATTRIBUTES = [
  { key: "kraft", label: "Kraft", value: 3, icon: "/mnt/data/Kraft.png", hints: ["Sprinten", "Heben", "Zerschlagen"] },
  { key: "agilitaet", label: "Agilität", value: 4, icon: "/mnt/data/Agilität.png", hints: ["Ausweichen", "Bewegen", "Akrobatik"] },
  { key: "konstitution", label: "Konstitution", value: 2, icon: "/mnt/data/Konstitution.png", hints: ["Widerstehen", "Durchhalten", "Ertragen"] },
  { key: "willenskraft", label: "Willenskraft", value: 1, icon: "/mnt/data/Willenskraft.png", hints: ["Fokus", "Standhalten", "Mental"] },
  { key: "intelligenz", label: "Intelligenz", value: 3, icon: "/mnt/data/Intelligenz.png", hints: ["Wissen", "Erkennen", "Analysieren"] },
  { key: "instinkt", label: "Instinkt", value: 2, icon: "/mnt/data/Instinkt.png", hints: ["Wahrnehmen", "Einschätzen", "Überblicken"] },
  { key: "auftreten", label: "Auftreten", value: 1, icon: "/mnt/data/Auftreten.png", hints: ["Überzeugen", "Beeindrucken", "Anführen"] },
  { key: "meisterschaft", label: "Meisterschaft", value: 4, icon: "/mnt/data/Meisterschaft.png", hints: ["Waffen", "Werkzeuge", "Präzision"] },
];

export const DEMO_CARDS = [
  { name: "Schicksalskind", text: "Einmal pro Szene darfst du einen Wurf wiederholen." },
  { name: "Gezeichnet", text: "Du erhältst +1 auf alle Würfe, wenn du unter Stress stehst." },
  { name: "Intuitive Eingebung", text: "Stelle 1 Inspiration wieder her, wenn du einen Erfolg mit Intuition erzielst." },
  { name: "Dunkle Vorahnung", text: "Du darfst eine Bedrohung vorausahnen, bevor der SL sie ansagt." },
];

export const BOTTOM_TABS = [
  { name: "Startfähigkeiten", icon: Sparkles },
  { name: "Spezialisierung", icon: Star },
  { name: "Fatekarten", icon: BookOpen },
  { name: "Magische Gegenstände", icon: Gem },
  { name: "Magische Waffen", icon: Swords },
  { name: "Waffen", icon: Swords },
  { name: "Ausrüstung", icon: Package },
  { name: "Tränke", icon: Wand2 },
  { name: "Materialien", icon: Package },
  { name: "Volk", icon: Sparkles },
  { name: "Gesellschaft", icon: Star },
  { name: "Transmutation", icon: Wand2 },
  { name: "Notizen", icon: Feather },
];
