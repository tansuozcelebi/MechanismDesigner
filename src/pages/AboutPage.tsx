import {
  DEVELOPER,
  METHODS,
  PROJECT_FACTS,
  TECH_STACK,
  VERIFICATION,
  type Bilingual,
} from '../content/about';
import { LogoFull } from '../ui/Logo';
import { hrefFor } from '../app/router';
import { useI18n, useT } from '../i18n';

/** Pick the active language out of a bilingual string. */
const useLocal = () => {
  const { lang } = useI18n();
  return (b: Bilingual) => b[lang] ?? b.en;
};

export default function AboutPage() {
  const t = useT();
  const L = useLocal();

  return (
    <div className="page">
      <div className="page-inner">
        <header className="hero">
          <LogoFull size={54} tagline={t('about.tagline')} />
          <p className="lede">{t('about.lede')}</p>
        </header>

        {/* ---------------------------- developer ---------------------------- */}
        <section className="card profile">
          <div className="avatar" aria-hidden="true">
            {DEVELOPER.initials}
          </div>
          <div className="profile-body">
            <h2>{DEVELOPER.name}</h2>
            <div className="role">{L(DEVELOPER.role)}</div>
            {DEVELOPER.bio.map((p, i) => (
              <p key={i}>{L(p)}</p>
            ))}
            <div className="links">
              {DEVELOPER.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noreferrer noopener"
                >
                  <span className="k">{l.label}</span>
                  <span className="v">{l.text}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------- project ----------------------------- */}
        <section>
          <h2 className="section-title">{t('about.project')}</h2>
          <p>{t('about.projectBody')}</p>
          <div className="factgrid">
            {PROJECT_FACTS.map((f, i) => (
              <div className="fact" key={i}>
                <div className="fv">{f.value}</div>
                <div className="fl">{L(f.label)}</div>
                <div className="fn">{L(f.note)}</div>
              </div>
            ))}
          </div>
          <p className="fineprint">{t('about.factsNote')}</p>
        </section>

        {/* ----------------------------- methods ----------------------------- */}
        <section>
          <h2 className="section-title">{t('about.methods')}</h2>
          <div className="cards">
            {METHODS.map((m, i) => (
              <div className="card" key={i}>
                <h3>{L(m.title)}</h3>
                <p>{L(m.body)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------ stack ------------------------------ */}
        <section>
          <h2 className="section-title">{t('about.stack')}</h2>
          <table className="plain">
            <tbody>
              {TECH_STACK.map((s) => (
                <tr key={s.name}>
                  <td className="mono">{s.name}</td>
                  <td>{L(s.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* --------------------------- verification -------------------------- */}
        <section>
          <h2 className="section-title">{t('about.verification')}</h2>
          <ul className="checks">
            {VERIFICATION.map((v, i) => (
              <li key={i}>{L(v)}</li>
            ))}
          </ul>
        </section>

        <section className="cta">
          <a className="btn" href={hrefFor('theory')}>
            {t('about.toTheory')}
          </a>
          <a className="btn" href={hrefFor('designer')}>
            {t('about.toDesigner')}
          </a>
        </section>

        <footer className="page-footer">{t('about.footer')}</footer>
      </div>
    </div>
  );
}
