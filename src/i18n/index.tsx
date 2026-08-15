import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { dictionaries, LANGUAGES, type Lang, type TranslationKey } from './translations';

const STORAGE_KEY = 'kreamet.lang';

/** Values substituted into `{placeholder}` slots. */
export type TVars = Record<string, string | number>;

export type Translate = (key: TranslationKey, vars?: TVars) => string;

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translate;
};

const I18nContext = createContext<I18nValue | null>(null);

const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.code === v);

/**
 * Initial language: an explicit earlier choice wins, otherwise the browser's
 * preference, otherwise English.  Resolved once at startup so the first paint is
 * already in the right language rather than flashing English first.
 */
function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // localStorage can throw in private/blocked contexts; fall through.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

/** Replace every `{name}` in `template` with `vars.name`. */
export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Persisting the choice is a convenience, not a requirement.
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback<Translate>(
    (key, vars) => interpolate(dictionaries[lang][key] ?? dictionaries.en[key] ?? key, vars),
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Convenience for components that only need the translate function. */
export const useT = (): Translate => useI18n().t;

export { LANGUAGES, STORAGE_KEY };
export type { Lang, TranslationKey };
