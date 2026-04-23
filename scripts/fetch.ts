import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENDPOINT = "https://api.opire.dev/rewards?page=1&itemsPerPage=100";

type User = { id: string; username: string; avatarURL: string };
type Verdict = "AVOID" | "REDOCEAN" | "CAUTION" | "CANDIDATE" | "UNKNOWN";

type Bounty = {
  id: string;
  amount_usd: number;
  title: string | null;
  url: string | null;
  platform: string;
  org_name: string | null;
  org_url: string | null;
  project_name: string | null;
  project_url: string | null;
  project_repo_owner: string | null;
  programming_languages: string[];
  claimer_usernames: string[];
  trying_usernames: string[];
  created_at: string | null;
  fetched_at: string;
  issue_state?: "open" | "closed" | "unknown";
  issue_assignees?: string[];
  issue_labels?: string[];
  attempt_count?: number;
  existing_pr_count?: number;
  gating_flags?: string[];
  verdict?: Verdict;
  availability_checked_at?: string;
};

const GATING_LABEL_PATTERNS = [
  { pattern: /core\s*team/i, flag: "core-team-only" },
  { pattern: /reserved.*(interview|hire|hiring|se[-\s]interview)/i, flag: "reserved-for-interview" },
  { pattern: /maintainer.*only/i, flag: "maintainers-only" },
  { pattern: /internal\s*only/i, flag: "internal-only" },
  { pattern: /do\s*not\s*(work|fix|implement)/i, flag: "do-not-work" },
];

const GATING_BODY_PATTERNS = [
  { pattern: /reserved\s+for\s+(se\s+)?interview/i, flag: "reserved-for-interview" },
  { pattern: /core\s+team\s+only/i, flag: "core-team-only" },
  { pattern: /only\s+for\s+core\s+team/i, flag: "core-team-only" },
];

async function ghFetch(url: string, token: string | undefined): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "opire-watcher",
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function enrichIssue(
  url: string | null,
  token: string | undefined,
): Promise<{
  state: "open" | "closed" | "unknown";
  assignees: string[];
  labels: string[];
  attempt_count: number;
  existing_pr_count: number;
  gating_flags: string[];
} | null> {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
  if (!m) return null;
  const [, owner, repo, num] = m;

  const issue = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${num}`,
    token,
  );
  if (!issue) return { state: "unknown", assignees: [], labels: [], attempt_count: 0, existing_pr_count: 0, gating_flags: [] };

  const state: "open" | "closed" | "unknown" =
    issue.state === "closed" ? "closed" : issue.state === "open" ? "open" : "unknown";
  const assignees: string[] = (issue.assignees ?? []).map((a: any) => a.login);
  const labels: string[] = (issue.labels ?? [])
    .map((l: any) => (typeof l === "string" ? l : l?.name ?? ""))
    .filter(Boolean);
  const body: string = issue.body ?? "";

  const gating_flags_set = new Set<string>();
  for (const l of labels) {
    for (const { pattern, flag } of GATING_LABEL_PATTERNS) {
      if (pattern.test(l)) gating_flags_set.add(flag);
    }
  }
  for (const { pattern, flag } of GATING_BODY_PATTERNS) {
    if (pattern.test(body)) gating_flags_set.add(flag);
  }

  let attempt_count = 0;
  const comments = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${num}/comments?per_page=100`,
    token,
  );
  if (Array.isArray(comments)) {
    for (const c of comments) {
      const cb: string = c?.body ?? "";
      if (/\/attempt\b/i.test(cb)) attempt_count++;
      for (const { pattern, flag } of GATING_BODY_PATTERNS) {
        if (pattern.test(cb)) gating_flags_set.add(flag);
      }
    }
  }

  let existing_pr_count = 0;
  const prSet = new Set<number>();
  let page = 1;
  while (page <= 5) {
    const timeline = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${num}/timeline?per_page=100&page=${page}`,
      token,
    );
    if (!Array.isArray(timeline) || timeline.length === 0) break;
    for (const e of timeline) {
      if (
        e?.event === "cross-referenced" &&
        e?.source?.issue?.pull_request &&
        typeof e?.source?.issue?.number === "number"
      ) {
        prSet.add(e.source.issue.number);
      }
    }
    if (timeline.length < 100) break;
    page++;
  }
  existing_pr_count = prSet.size;

  return {
    state,
    assignees,
    labels,
    attempt_count,
    existing_pr_count,
    gating_flags: [...gating_flags_set],
  };
}

function computeVerdict(b: Bounty): Verdict {
  if (b.issue_state === "closed") return "AVOID";
  if (b.claimer_usernames.length > 0) return "AVOID";
  if (b.issue_state === undefined || b.issue_state === "unknown") return "UNKNOWN";
  if (b.gating_flags && b.gating_flags.length > 0) return "AVOID";
  if (b.issue_assignees && b.issue_assignees.length > 0) return "AVOID";
  const attempts = b.attempt_count ?? 0;
  const prs = b.existing_pr_count ?? 0;
  if (attempts >= 10 || prs >= 5) return "REDOCEAN";
  if (attempts >= 3 || prs >= 2) return "CAUTION";
  return "CANDIDATE";
}

function extractRepoOwner(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\//i);
  return m ? m[1].toLowerCase() : null;
}

function toUsd(price: { value: number; unit: string } | null | undefined): number {
  if (!price) return 0;
  if (price.unit === "USD_CENT") return price.value / 100;
  return price.value;
}

function toIso(ms: number | null | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

async function main() {
  const res = await fetch(ENDPOINT, {
    headers: {
      "user-agent": "opire-watcher (+https://github.com/yasumorishima/opire-watcher)",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = (await res.json()) as any[];

  const now = new Date().toISOString();
  const bounties: Bounty[] = items.map((b: any) => ({
    id: b.id,
    amount_usd: toUsd(b.pendingPrice),
    title: b.title ?? null,
    url: b.url ?? null,
    platform: b.platform ?? "unknown",
    org_name: b.organization?.name ?? null,
    org_url: b.organization?.url ?? null,
    project_name: b.project?.name ?? null,
    project_url: b.project?.url ?? null,
    project_repo_owner: extractRepoOwner(b.project?.url ?? b.url ?? null),
    programming_languages: Array.isArray(b.programmingLanguages) ? b.programmingLanguages : [],
    claimer_usernames: Array.isArray(b.claimerUsers)
      ? b.claimerUsers.map((u: User) => u.username)
      : [],
    trying_usernames: Array.isArray(b.tryingUsers)
      ? b.tryingUsers.map((u: User) => u.username)
      : [],
    created_at: toIso(b.createdAt),
    fetched_at: now,
  }));

  const outPath = resolve("data/bounties.json");
  const prev: Bounty[] = existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, "utf-8"))
    : [];
  const prevIds = new Set(prev.map((b) => b.id));
  const newOnes = bounties.filter((b) => !prevIds.has(b.id));

  const ghToken = process.env.GITHUB_TOKEN;
  for (const b of bounties) {
    const info = await enrichIssue(b.url, ghToken);
    if (info) {
      b.issue_state = info.state;
      b.issue_assignees = info.assignees;
      b.issue_labels = info.labels;
      b.attempt_count = info.attempt_count;
      b.existing_pr_count = info.existing_pr_count;
      b.gating_flags = info.gating_flags;
      b.availability_checked_at = now;
    }
    b.verdict = computeVerdict(b);
  }

  const prevById = new Map(prev.map((b) => [b.id, b]));
  for (const b of bounties) {
    if (b.issue_state === undefined) {
      const p = prevById.get(b.id);
      if (p?.issue_state !== undefined) {
        b.issue_state = p.issue_state;
        b.issue_assignees = p.issue_assignees;
        b.issue_labels = p.issue_labels;
        b.attempt_count = p.attempt_count;
        b.existing_pr_count = p.existing_pr_count;
        b.gating_flags = p.gating_flags;
        b.availability_checked_at = p.availability_checked_at;
        b.verdict = computeVerdict(b);
      }
    }
  }

  for (const b of newOnes) {
    const enriched = bounties.find((x) => x.id === b.id);
    if (enriched) {
      b.issue_state = enriched.issue_state;
      b.issue_assignees = enriched.issue_assignees;
      b.issue_labels = enriched.issue_labels;
      b.attempt_count = enriched.attempt_count;
      b.existing_pr_count = enriched.existing_pr_count;
      b.gating_flags = enriched.gating_flags;
      b.verdict = enriched.verdict;
      b.availability_checked_at = enriched.availability_checked_at;
    }
  }

  const stalePrev = prev.filter((b) => !bounties.some((c) => c.id === b.id));
  for (const b of stalePrev) {
    const info = await enrichIssue(b.url, ghToken);
    if (info) {
      b.issue_state = info.state;
      b.issue_assignees = info.assignees;
      b.issue_labels = info.labels;
      b.attempt_count = info.attempt_count;
      b.existing_pr_count = info.existing_pr_count;
      b.gating_flags = info.gating_flags;
      b.availability_checked_at = now;
    }
    b.verdict = computeVerdict(b);
  }

  const merged = [...bounties, ...stalePrev].sort(
    (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );

  writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
  writeFileSync(
    resolve("data/new-bounties.json"),
    JSON.stringify(newOnes, null, 2) + "\n",
  );

  console.log(`fetched=${bounties.length} new=${newOnes.length} total=${merged.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
