import { describe, expect, it } from 'vitest';
import { en, tr, dictionaries, LANGUAGES, APP_NAME } from '../src/i18n/translations';
import { interpolate } from '../src/i18n';
const keys = Object.keys(en);
describe('translations', () => {
    it('ships both languages', () => {
        expect(LANGUAGES.map((l) => l.code).sort()).toEqual(['en', 'tr']);
        expect(Object.keys(dictionaries).sort()).toEqual(['en', 'tr']);
    });
    it('is named KREAMET', () => {
        expect(APP_NAME).toBe('KREAMET');
    });
    it('has exactly the same key set in every language', () => {
        for (const [code, dict] of Object.entries(dictionaries)) {
            expect(Object.keys(dict).sort(), `language ${code}`).toEqual([...keys].sort());
        }
    });
    it('has no empty or whitespace-only strings', () => {
        for (const [code, dict] of Object.entries(dictionaries)) {
            for (const k of keys) {
                expect(dict[k].trim().length, `${code}:${k}`).toBeGreaterThan(0);
            }
        }
    });
    it('uses the same placeholders in every language', () => {
        // A missing or misspelled {slot} silently renders a literal brace to the
        // user, so the two dictionaries must agree on the interpolation contract.
        const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        for (const k of keys) {
            expect(slots(tr[k]), `placeholders for ${k}`).toEqual(slots(en[k]));
        }
    });
    it('actually translates — Turkish differs from English for prose keys', () => {
        // Symbol-only strings (equations, axis labels) are intentionally identical.
        const identical = keys.filter((k) => en[k] === tr[k]);
        const proseLike = identical.filter((k) => /[a-z]{4,}\s+[a-z]{3,}/i.test(en[k]));
        expect(proseLike).toEqual([]);
    });
});
describe('interpolate', () => {
    it('substitutes named slots', () => {
        expect(interpolate('{a} of {b}', { a: 3, b: 'x' })).toBe('3 of x');
    });
    it('leaves unknown slots untouched rather than printing undefined', () => {
        expect(interpolate('{a} {b}', { a: 1 })).toBe('1 {b}');
    });
    it('is a no-op without vars', () => {
        expect(interpolate('plain text')).toBe('plain text');
    });
    it('substitutes every occurrence', () => {
        expect(interpolate('{n}+{n}', { n: 2 })).toBe('2+2');
    });
});
