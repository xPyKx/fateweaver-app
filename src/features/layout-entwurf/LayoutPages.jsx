import { CreationWizard } from "../creation-wizard/CreationWizard";
import { GMDashboardView, GMPreparationView } from "../gm-session/GMSessionView";
import { GMSettings } from "../gm/GMSettings";
import { LevelUpView } from "../level-up/LevelUpView";

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#05070b] text-[#f4ead7]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(126,91,45,.24),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(54,36,78,.35),transparent_30%),linear-gradient(180deg,#080a0f_0%,#0d1119_50%,#05070b_100%)]" />
      <div className="mx-auto max-w-[1540px] p-2 md:p-3 xl:p-3">{children}</div>
    </main>
  );
}

function GoldPanel({ children, className = "" }) {
  return (
    <div className={`relative border border-[#a8752a]/60 bg-[linear-gradient(180deg,rgba(13,18,27,.96),rgba(5,7,11,.94))] shadow-[0_20px_55px_rgba(0,0,0,.45)] ${className}`}>
      <div className="pointer-events-none absolute left-2 top-2 h-5 w-5 border-l border-t border-[#e6b866]/70" />
      <div className="pointer-events-none absolute right-2 top-2 h-5 w-5 border-r border-t border-[#e6b866]/70" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b border-l border-[#e6b866]/70" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-b border-r border-[#e6b866]/70" />
      {children}
    </div>
  );
}

export function CreatePage({ onBack, onSheet, onLevelUp }) {
  return (
    <Shell>
      <div className="space-y-5">
        <button onClick={onBack} className="border border-[#a8752a]/40 bg-black/35 px-4 py-2 text-[#cfc2aa] hover:text-[#f2ca75]">Zurueck</button>
        <GoldPanel className="p-5">
          <CreationWizard onDone={onBack} onSheet={onSheet} onLevelUp={onLevelUp} />
        </GoldPanel>
      </div>
    </Shell>
  );
}

export function GMPage({ onBack }) {
  return (
    <Shell>
      <div className="space-y-5">
        <button onClick={onBack} className="border border-[#a8752a]/40 bg-black/35 px-4 py-2 text-[#cfc2aa] hover:text-[#f2ca75]">Zurueck</button>
        <GoldPanel className="p-5">
          <GMSettings />
        </GoldPanel>
      </div>
    </Shell>
  );
}

export function GMPreparationPage({ onBack }) {
  return (
    <Shell>
      <GoldPanel className="p-5">
        <GMPreparationView onBack={onBack} />
      </GoldPanel>
    </Shell>
  );
}

export function GMDashboardPage({ onBack }) {
  return (
    <Shell>
      <GoldPanel className="p-5">
        <GMDashboardView onBack={onBack} />
      </GoldPanel>
    </Shell>
  );
}

export const GMSessionPage = GMDashboardPage;

export function LevelPage({ onBack }) {
  return (
    <Shell>
      <GoldPanel className="p-5">
        <LevelUpView onBack={onBack} />
      </GoldPanel>
    </Shell>
  );
}
