import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script without type declarations
import { evaluate, mergeTitle } from '../scripts/automerge.mjs';

const pr = (over: Record<string, unknown> = {}) => ({
  number: 16,
  title: 'Panels menu',
  state: 'open',
  draft: false,
  base: { ref: 'main' },
  labels: [{ name: 'automerge' }],
  mergeable: true,
  mergeable_state: 'clean',
  ...over,
});
const run = (name: string, status = 'completed', conclusion: string | null = 'success') => ({
  name,
  status,
  conclusion,
});
const green = [run('Typecheck · tests · build'), run('Browser smoke test')];

describe('automerge rules', () => {
  it('merges a labelled, clean PR whose checks all passed', () => {
    expect(evaluate(pr(), green)).toEqual({ ok: true });
  });

  it('waits for checks that have not finished, and for checks that have not started', () => {
    expect(evaluate(pr(), [...green, run('Browser smoke test', 'in_progress', null)]).ok).toBe(false);
    // No checks yet is not "nothing failed": GitHub's own auto-merge would
    // merge here on a repository without branch protection.
    expect(evaluate(pr(), []).reason).toMatch(/no checks/);
  });

  it('refuses failing or cancelled checks', () => {
    for (const c of ['failure', 'cancelled', 'timed_out', 'action_required']) {
      expect(evaluate(pr(), [...green, run('x', 'completed', c)]).ok, c).toBe(false);
    }
    expect(evaluate(pr(), [...green, run('x', 'completed', 'skipped')]).ok).toBe(true);
  });

  it('ignores its own running job', () => {
    expect(evaluate(pr(), [...green, run('Auto-merge ready pull requests', 'in_progress', null)]).ok).toBe(true);
  });

  it('refuses drafts, closed PRs, other bases, conflicts and unlabelled PRs', () => {
    expect(evaluate(pr({ draft: true }), green).ok).toBe(false);
    expect(evaluate(pr({ state: 'closed' }), green).ok).toBe(false);
    expect(evaluate(pr({ base: { ref: 'dev' } }), green).ok).toBe(false);
    expect(evaluate(pr({ mergeable: false, mergeable_state: 'dirty' }), green).reason).toMatch(/conflict/);
    expect(evaluate(pr({ mergeable_state: 'blocked' }), green).ok).toBe(false);
    expect(evaluate(pr({ labels: [] }), green).ok).toBe(false);
    // Naming the PR explicitly stands in for the label.
    expect(evaluate(pr({ labels: [] }), green, { requireLabel: false }).ok).toBe(true);
  });

  it('keeps the repository’s merge-commit title convention', () => {
    expect(mergeTitle(pr())).toBe('Merge pull request #16: Panels menu');
  });
});
