import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { dictionaries, LANGUAGES } from './translations';
const STORAGE_KEY = 'kreamet.lang';
const I18nContext = createContext(null);
const isLang = (v) => LANGUAGES.some((l) => l.code === v);
/**
 * Initial language: an explicit earlier choice wins, otherwise the browser's
 * preference, otherwise English.  Resolved once at startup so the first paint is
 * already in the right language rather than flashing English first.
 */
function detectLang() {
    if (typeof window === 'undefined')
        return 'en';
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (isLang(saved))
            return saved;
    }
    catch {
        // localStorage can throw in private/blocked contexts; fall through.
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    return nav.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}
/** Replace every `{name}` in `template` with `vars.name`. */
export function interpolate(template, vars) {
    if (!vars)
        return template;
    return template.replace(/\{(\w+)\}/g, (whole, name) => Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole);
}
export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(detectLang);
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, lang);
        }
        catch {
            // Persisting the choice is a convenience, not a requirement.
        }
        document.documentElement.lang = lang;
    }, [lang]);
    const setLang = useCallback((l) => setLangState(l), []);
    const t = useCallback((key, vars) => interpolate(dictionaries[lang][key] ?? dictionaries.en[key] ?? key, vars), [lang]);
    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx)
        throw new Error('useI18n must be used inside <I18nProvider>');
    return ctx;
}
/** Convenience for components that only need the translate function. */
export const useT = () => useI18n().t;
export { LANGUAGES, STORAGE_KEY };
