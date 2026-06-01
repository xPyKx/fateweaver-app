import { Suspense, lazy, useState } from "react";
import { CharacterOverview } from "./CharacterOverview";
import { GoldPanel, Shell } from "./layoutPrimitives";
import { useGameStore } from "../../lib/store/GameStore";

const CharacterSheetView = lazy(() => import("./CharacterSheetView").then((module) => ({ default: module.CharacterSheetView })));
const CreationWizard = lazy(() => import("../creation-wizard/CreationWizard").then((module) => ({ default: module.CreationWizard })));
const GMSettings = lazy(() => import("../gm/GMSettings").then((module) => ({ default: module.GMSettings })));
const GMDashboardView = lazy(() => import("../gm-session/GMSessionView").then((module) => ({ default: module.GMDashboardView })));
const LevelUpView = lazy(() => import("../level-up/LevelUpView").then((module) => ({ default: module.LevelUpView })));

export default function CharacterSheetLayout() {
  const { data, activeCharacter } = useGameStore();
  const [page, setPage] = useState("overview");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const currentCharacterId = selectedCharacter ?? activeCharacter?.id ?? data.activeCharacterId ?? data.characters[0]?.id ?? null;

  if (page === "create") {
    return (
      <FeaturePage onBack={() => setPage("overview")}>
        <CreationWizard onDone={() => setPage("overview")} onSheet={() => setPage("sheet")} onLevelUp={() => setPage("level")} />
      </FeaturePage>
    );
  }

  if (page === "gm") {
    return (
      <FeaturePage onBack={() => setPage("overview")}>
        <GMSettings />
      </FeaturePage>
    );
  }

  if (page === "gmDashboard") {
    return (
      <FeaturePage>
        <GMDashboardView onBack={() => setPage("overview")} />
      </FeaturePage>
    );
  }

  if (page === "level") {
    return (
      <FeaturePage>
        <LevelUpView onBack={() => setPage("sheet")} />
      </FeaturePage>
    );
  }

  if (page === "sheet") {
    return (
      <Suspense fallback={<PageLoading label="Charakterbogen wird geladen" />}>
        <CharacterSheetView selectedCharacter={currentCharacterId} onBack={() => setPage("overview")} onEditCharacter={() => setPage("create")} onLevelUp={() => setPage("level")} />
      </Suspense>
    );
  }

  return (
    <CharacterOverview
      onOpenCharacter={(id) => {
        setSelectedCharacter(id);
        setPage("sheet");
      }}
      onOpenGM={() => setPage("gm")}
      onOpenGMSession={() => setPage("gmDashboard")}
      onCreateCharacter={(id) => {
        setSelectedCharacter(id);
        setPage("create");
      }}
    />
  );
}

function FeaturePage({ children, onBack }) {
  return (
    <Shell>
      <div className="space-y-5">
        {onBack && <button onClick={onBack} className="border border-[#a8752a]/40 bg-black/35 px-4 py-2 text-[#cfc2aa] hover:text-[#f2ca75]">Zurueck</button>}
        <GoldPanel className="p-5">
          <Suspense fallback={<FeatureLoading />}>{children}</Suspense>
        </GoldPanel>
      </div>
    </Shell>
  );
}

function FeatureLoading() {
  return (
    <div className="grid min-h-[420px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-4 h-9 w-9 animate-spin border-2 border-[#a8752a]/40 border-t-[#ffd88c]" />
        <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">Laden</div>
        <div className="mt-2 text-[#cfc2aa]">Bereich wird vorbereitet...</div>
      </div>
    </div>
  );
}

function PageLoading({ label }) {
  return (
    <Shell>
      <GoldPanel className="p-5">
        <div className="grid min-h-[420px] place-items-center text-center">
          <div>
            <div className="mx-auto mb-4 h-9 w-9 animate-spin border-2 border-[#a8752a]/40 border-t-[#ffd88c]" />
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">Laden</div>
            <div className="mt-2 text-[#cfc2aa]">{label}...</div>
          </div>
        </div>
      </GoldPanel>
    </Shell>
  );
}
