import CharacterSheetLayout from "../features/layout-entwurf/CharacterSheetLayout";
import { GameStoreProvider } from "../lib/store/GameStore";

export function App() {
  return (
    <GameStoreProvider>
      <CharacterSheetLayout />
    </GameStoreProvider>
  );
}
