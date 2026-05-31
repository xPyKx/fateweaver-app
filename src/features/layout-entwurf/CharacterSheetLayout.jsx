import { useState } from "react";
import { CreatePage, GMPage, GMSessionPage, LevelPage } from "./LayoutPages";
import { CharacterOverview } from "./CharacterOverview";
import { CharacterSheetView } from "./CharacterSheetView";
import { useGameStore } from "../../lib/store/GameStore";

export default function CharacterSheetLayout() {
  const { data, activeCharacter } = useGameStore();
  const [page, setPage] = useState("overview");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const currentCharacterId = selectedCharacter ?? activeCharacter?.id ?? data.activeCharacterId ?? data.characters[0]?.id ?? null;

  if (page === "create") return <CreatePage onBack={() => setPage("overview")} onSheet={() => setPage("sheet")} onLevelUp={() => setPage("level")} />;
  if (page === "gm") return <GMPage onBack={() => setPage("overview")} />;
  if (page === "gmSession") return <GMSessionPage onBack={() => setPage("overview")} />;
  if (page === "level") return <LevelPage onBack={() => setPage("sheet")} />;
  if (page === "sheet") return <CharacterSheetView selectedCharacter={currentCharacterId} onBack={() => setPage("overview")} onEditCharacter={() => setPage("create")} onLevelUp={() => setPage("level")} />;

  return (
    <CharacterOverview
      onOpenCharacter={(id) => {
        setSelectedCharacter(id);
        setPage("sheet");
      }}
      onOpenGM={() => setPage("gm")}
      onOpenGMSession={() => setPage("gmSession")}
      onCreateCharacter={(id) => {
        setSelectedCharacter(id);
        setPage("create");
      }}
    />
  );
}
