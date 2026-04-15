import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENDPOINT = "https://api.opire.dev/rewards?page=1&itemsPerPage=100";

type User = { id: string; username: string; avatarURL: string };
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
};

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

  const merged = [
    ...bounties,
    ...prev.filter((b) => !bounties.some((c) => c.id === b.id)),
  ].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

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
