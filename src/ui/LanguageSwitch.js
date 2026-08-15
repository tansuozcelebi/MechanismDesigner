import { jsx as _jsx } from "react/jsx-runtime";
import { LANGUAGES, useI18n } from '../i18n';
/**
 * Two-state language selector in the header.  A segmented control rather than a
 * dropdown: with exactly two languages both options stay visible, so the choice
 * costs one click and the current language is readable at a glance.
 */
export function LanguageSwitch() {
    const { lang, setLang, t } = useI18n();
    return (_jsx("div", { className: "langswitch", role: "group", "aria-label": t('app.lang.aria'), children: LANGUAGES.map((l) => (_jsx("button", { type: "button", className: l.code === lang ? 'active' : '', "aria-pressed": l.code === lang, title: l.name, onClick: () => setLang(l.code), children: l.label }, l.code))) }));
}
