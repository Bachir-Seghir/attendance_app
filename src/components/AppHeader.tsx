import type { AuthUser } from "../services/api";

interface AppHeaderProps {
  user: AuthUser;
  onLogout: () => void;
}

function AppHeader({ user, onLogout }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-emerald-900 text-white shadow-md">
      <div className="flex items-center justify-between gap-4 px-6 py-3">

        {/* Left: Logo and application title */}
        <div className="flex items-center gap-4">
          <img
            src="/sonatrach.svg"
            alt="SONATRACH"
            className="h-18 w-18 rounded-lg bg-white p-1"
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Platforme de Pointage SOMIK - CP1Z
            </h1>

            <p className="text-emerald-100 text-xs mt-2 font-bold">
              Développée Par Bachir.Seghir@Sonatrach.dz
            </p>
          </div>
        </div>

        {/* Right: User information and logout */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="font-semibold">{user.name}</span>
            <span className="text-xs text-emerald-100">
              {user.role}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium hover:bg-emerald-800 transition"
          >
            Déconnecter
          </button>
        </div>

      </div>
    </header>
  );
}

export default AppHeader;