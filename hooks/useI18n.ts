import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTranslation, AppLanguage } from "@/constants/i18n";

export function useI18n() {
  const { user } = useAuth();
  const lang = (user?.language ?? "en") as AppLanguage;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getTranslation(lang, key, params);
    },
    [lang]
  );

  return { t, lang };
}
