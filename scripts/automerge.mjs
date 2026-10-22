/**
 * Merge pull requests that are ready, and only those.
 *
 *   node scripts/automerge.mjs              # every open PR labelled `automerge`
 *   node scripts/automerge.mjs --pr 16      # one PR, label not required
 *   node scripts/automerge.mjs --dry-run    # say what would happen, change nothing
 *
 * Talks to the API with GITHUB_TOKEN (the workflow), or through an
 * authenticated `gh` CLI with `--via-gh` (a developer machine, where `gh auth
 * login` already holds the credentials). Runs from
 * `.github/workflows/automerge.yml` after every CI run, and by hand.
 *
 * "Ready" is checked here rather than delegated to GitHub's own auto-merge,
 * because that feature only waits for *required* checks — and this
 * repository has no branch protection, so it would merge the moment a PR was
 * opened, before CI had even started. Here a PR merges only when:
 *
 *   - it is open, not a draft, and targets the default branch;
 *   - GitHub reports it mergeable with no conflict (`clean`, or `unstable`
 *     when the only non-green check is this job itself);
 *   - its head commit has at least one check run, every check run has
 *     finished, and none of them failed;
 *   - its head has not moved since those checks were read (the merge is
 *     pinned to that SHA, so a push in between makes it fail, not slip in).
 *
 * The merge commit keeps the repository's existing title convention:
 * "Merge pull request #N: <title>".
 *
 * A merge made with the workflow's GITHUB_TOKEN does not trigger other
 * workflows — GitHub's rule against recursive runs — so the push to main would
 * not run CI, and the deploy (chained to CI) would never fire. Dispatching CI
 * does not help either: it runs, but a run started by the bot does not raise
 * the `workflow_run` event the deploy listens for (seen on #17: CI green on
 * main, no deploy). So `--dispatch-deploy` starts the deploy itself, pinned to
 * the merge commit. The PR's head already passed CI, and the merge is only
 * made when GitHub reports it conflict-free, so that commit is what was
 * tested.
 */

import { execFileSync } from 'node:child_process';

const API = 'https://api.github.com';
const LABEL = 'automerge';
/** This workflow's own job: it is running while it looks, so never wait on it. */
const SELF_CHECKS = new Set(['automerge', 'Auto-merge ready pull requests']);
const OK_CONCLUSIONS = new Set(['success', 'neutral', 'skipped']);

/**
 * Decide whether a PR may be merged. Pure, so the rules can be tested without
 * a network: returns `{ ok: true }` or `{ ok: false, reason }`.
 */
export function evaluate(pr, checkRuns, { defaultBranch = 'main', requireLabel = true } = {}) {
  if (pr.state !== 'open') return { ok: false, reason: `is ${pr.state}` };
  if (pr.draft) return { ok: false, reason: 'is a draft' };
  if (pr.base?.ref !== defaultBranch) return { ok: false, reason: `targets ${pr.base?.ref}, not ${defaultBranch}` };
  if (requireLabel && !(pr.labels ?? []).some((l) => l.name === LABEL))
    return { ok: false, reason: `has no "${LABEL}" label` };
  if (pr.mergeable === false || pr.mergeable_state === 'dirty')
    return { ok: false, reason: 'has a merge conflict' };
  // `unstable` only means some check on the head is not green — which is
  // also true while this very job is running on it. The check runs are
  // judged below, more strictly than GitHub does, so it is not a veto here.
  if (pr.mergeable_state !== 'clean' && pr.mergeable_state !== 'unstable')
    return { ok: false, reason: `is not cleanly mergeable yet (${pr.mergeable_state ?? 'unknown'})` };

  const runs = checkRuns.filter((c) => !SELF_CHECKS.has(c.name));
  if (runs.length === 0) return { ok: false, reason: 'has no checks on its head commit yet' };
  const pending = runs.filter((c) => c.status !== 'completed');
  if (pending.length) return { ok: false, reason: `is waiting on ${pending.map((c) => c.name).join(', ')}` };
  const failed = runs.filter((c) => !OK_CONCLUSIONS.has(c.conclusion));
  if (failed.length)
    return { ok: false, reason: `has failing checks: ${failed.map((c) => `${c.name} (${c.conclusion})`).join(', ')}` };
  return { ok: true };
}

export const mergeTitle = (pr) => `Merge pull request #${pr.number}: ${pr.title}`;

/* ------------------------------------------------------------------ */

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const viaGh = flag('--via-gh');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || 'tansuozcelebi/MechanismDesigner';
  const dryRun = flag('--dry-run');
  const dispatchDeploy = flag('--dispatch-deploy');
  let lastMerge = null;
  const onlyPr = value('--pr') ? Number(value('--pr')) : null;

  if (!token && !viaGh) {
    console.error('Set GITHUB_TOKEN, or pass --via-gh to use an authenticated gh CLI.');
    process.exit(2);
  }

  const viaCli = async (method, path, body) => {
    const out = execFileSync('gh', ['api', '-X', method, path.replace(/^\//, ''), ...(body ? ['--input', '-'] : [])], {
      input: body ? JSON.stringify(body) : undefined,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.trim() ? JSON.parse(out) : null;
  };

  const viaFetch = async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kreamet-automerge',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data?.message ?? text}`);
    return data;
  };

  const gh = viaGh ? viaCli : viaFetch;

  const { default_branch: defaultBranch } = await gh('GET', `/repos/${repo}`);

  const numbers = onlyPr
    ? [onlyPr]
    : (await gh('GET', `/repos/${repo}/pulls?state=open&base=${defaultBranch}&per_page=100`))
        .filter((p) => p.labels.some((l) => l.name === LABEL))
        .map((p) => p.number);

  if (numbers.length === 0) {
    console.log(`No open pull requests labelled "${LABEL}".`);
    return;
  }

  let merged = 0;
  for (const n of numbers) {
    // GitHub computes mergeability lazily: the first read after a push can
    // say `unknown`. A couple of short retries is enough to get the answer.
    let pr;
    for (let attempt = 0; attempt < 4; attempt++) {
      pr = await gh('GET', `/repos/${repo}/pulls/${n}`);
      if (pr.mergeable_state !== 'unknown' && pr.mergeable !== null) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    const { check_runs: checks } = await gh(
      'GET',
      `/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`,
    );
    const verdict = evaluate(pr, checks, { defaultBranch, requireLabel: onlyPr === null });
    if (!verdict.ok) {
      console.log(`#${n} skipped: ${verdict.reason}.`);
      continue;
    }
    if (dryRun) {
      console.log(`#${n} is ready; would merge as "${mergeTitle(pr)}" at ${pr.head.sha.slice(0, 7)}.`);
      continue;
    }
    const result = await gh('PUT', `/repos/${repo}/pulls/${n}/merge`, {
      merge_method: 'merge',
      commit_title: mergeTitle(pr),
      // Pinned: if anything was pushed after the checks were read, GitHub
      // refuses the merge instead of merging code nobody tested.
      sha: pr.head.sha,
    });
    merged++;
    lastMerge = result.sha;
    console.log(`#${n} merged: ${result.sha.slice(0, 7)} "${mergeTitle(pr)}".`);
  }

  // One deploy for the last merge: it contains every earlier one.
  if (lastMerge && dispatchDeploy && !dryRun) {
    await gh('POST', `/repos/${repo}/actions/workflows/deploy.yml/dispatches`, {
      ref: defaultBranch,
      inputs: { ref: lastMerge, mode: 'deploy' },
    });
    console.log(`Started the deploy of ${lastMerge.slice(0, 7)}.`);
  }
}

if (process.argv[1] && /automerge\.mjs$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
