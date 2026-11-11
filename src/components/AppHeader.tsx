
import type { AuthUser } from "../services/api";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

interface AppHeaderProps {
  user: AuthUser;
  onLogout: () => void;
}

function AppHeader({ user, onLogout }: AppHeaderProps) {
  const { t } = useTranslation();

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
            <h1 className="text-2xl tracking-tight">
              {t("app.title")}
            </h1>

            <p className="text-emerald-100 text-md mt-2">
              {t("app.developedBy")} Bachir.Seghir@Sonatrach.dz
            </p>
          </div>
        </div>

        {/* Right: User information, language and logout */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="font-semibold">{user.name}</span>
            <span className="text-xs text-emerald-100">
              {t(`roles.${user.role}`)}
            </span>
          </div>

          <LanguageSwitcher bg=""/>

          <button
            onClick={onLogout}
            className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium hover:bg-emerald-800 transition"
          >
            {t("app.logout")}
          </button>
        </div>

      </div>
    </header>
  );
}

export default AppHeader;
