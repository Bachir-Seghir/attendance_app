
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher({ bg }: { bg : string}) {
  const { i18n } = useTranslation();

  const changeLanguage = (language: "fr" | "en") => {
    i18n.changeLanguage(language);
    localStorage.setItem("app-language", language);
  };

    return (
      <div className="relative">
    <select
      value={i18n.language.startsWith("en") ? "en" : "fr"}
      onChange={(e) =>
        changeLanguage(e.target.value as "fr" | "en")
      }
                className={`bg-${bg} text-white w-full appearance-none rounded-lg  px-3 py-2 pr-7 text-sm`}
      aria-label="Select language"
    >
      <option value="fr">🇫🇷 Fr</option>
      <option value="en">🇬🇧 En</option>
      </select>
      <span className="pointer-events-none text-xs text-white absolute right-3 top-1/2 -translate-y-1/2">
    ▼
  </span>
        </div>
  );
}
