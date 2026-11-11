
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg"
      >
        <img src="/sonatrach.svg" alt="" className="w-30 h-30 mx-auto"/>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            {t("app.loginTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("login.info")}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("auth.identifier")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("auth.password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-800 p-3 font-semibold text-white transition hover:bg-emerald-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t("auth.loginIn") : t("auth.login") }
        </button>
        <div className="flex justify-center">

        <LanguageSwitcher bg="emerald-900" />
        </div>
      </form>
    </div>
  );
}
