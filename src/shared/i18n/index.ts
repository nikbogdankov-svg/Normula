import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, LANGUAGES, resources, type Language } from './locales';

const STORAGE_KEY = 'onemore.lang';

function detectLanguage(): Language {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as Language;
  } catch {
    // localStorage может быть недоступен — тогда пробуем браузер.
  }

  const navigatorLanguage = globalThis.navigator?.language?.slice(0, 2);
  if (navigatorLanguage && LANGUAGES.some((l) => l.code === navigatorLanguage)) {
    return navigatorLanguage as Language;
  }

  return DEFAULT_LANGUAGE;
}

i18next.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

/** Переключение языка с сохранением выбора. */
export function setLanguage(language: Language): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, language);
  } catch {
    // Игнорируем: без сохранения приложение продолжит работать.
  }
  void i18next.changeLanguage(language);
}

export const i18n = i18next;
export { useTranslation };
export type { Language };
export { LANGUAGES, DEFAULT_LANGUAGE };
