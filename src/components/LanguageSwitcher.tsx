
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (language: "fr" | "en") => {
    i18n.changeLanguage(language);
    localStorage.setItem("app-language", language);
  };

  return (
    <select
      value={i18n.language.startsWith("en") ? "en" : "fr"}
      onChange={(e) =>
        changeLanguage(e.target.value as "fr" | "en")
      }
      className="rounded-lg border border-gray-300  px-1 py-2 text-sm font-medium text-white outline-none focus:border-emerald-400 hover:cursor-pointer"
      aria-label="Select language"
    >
      <option value="fr">🇫🇷 Fr</option>
      <option value="en">🇬🇧 En</option>
    </select>
  );
}
