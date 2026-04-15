import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Bounty = {
  id: string;
  amount_usd: number;
  title: string | null;
  url: string | null;
  platform: string;
  org_name: string | null;
  project_repo_owner: string | null;
  programming_languages: string[];
  claimer_usernames: string[];
  trying_usernames: string[];
  created_at: string | null;
};

function isAvailable(b: Bounty): boolean {
  if (b.claimer_usernames.length > 0) return false;
  return true;
}

const START = "<!-- stats-start -->";
const END = "<!-- stats-end -->";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function topRepos(bounties: Bounty[], limit = 5): string {
  const by = new Map<string, { n: number; sum: number }>();
  for (const b of bounties) {
    const k = b.project_repo_owner ?? "(unknown)";
    const cur = by.get(k) ?? { n: 0, sum: 0 };
    cur.n += 1;
    cur.sum += b.amount_usd;
    by.set(k, cur);
  }
  const rows = [...by.entries()]
    .sort((a, b) => b[1].sum - a[1].sum)
    .slice(0, limit)
    .map(([k, v]) => `| ${k} | ${v.n} | $${fmt(v.sum)} |`)
    .join("\n");
  return `| Repo owner | Count | Total |\n| --- | ---: | ---: |\n${rows}`;
}

function topLanguages(bounties: Bounty[], limit = 8): string {
  const by = new Map<string, { n: number; sum: number }>();
  for (const b of bounties) {
    const langs = b.programming_languages.length > 0 ? b.programming_languages : ["(unspecified)"];
    for (const lang of langs) {
      const cur = by.get(lang) ?? { n: 0, sum: 0 };
      cur.n += 1;
      cur.sum += b.amount_usd;
      by.set(lang, cur);
    }
  }
  const rows = [...by.entries()]
    .sort((a, b) => b[1].sum - a[1].sum)
    .slice(0, limit)
    .map(([k, v]) => `| ${k} | ${v.n} | $${fmt(v.sum)} |`)
    .join("\n");
  return `| Language | Count | Total |\n| --- | ---: | ---: |\n${rows}`;
}

function statusBadge(b: Bounty): string {
  if (b.claimer_usernames.length > 0)
    return `👥claimed(${b.claimer_usernames[0]})`;
  if (b.trying_usernames.length > 0)
    return `⏳trying(${b.trying_usernames.length})`;
  return "🟢open";
}

function main() {
  const bountiesPath = resolve("data/bounties.json");
  const readmePath = resolve("README.md");
  const bounties: Bounty[] = JSON.parse(readFileSync(bountiesPath, "utf-8"));
  const total = bounties.reduce((s, b) => s + b.amount_usd, 0);
  const now = new Date().toISOString().slice(0, 10);

  const available = bounties.filter(isAvailable);
  const availableTotal = available.reduce((s, b) => s + b.amount_usd, 0);
  const availableList = available
    .slice()
    .sort((a, b) => b.amount_usd - a.amount_usd)
    .slice(0, 20)
    .map((b) => {
      const title = b.title ?? "(no title)";
      const link = b.url ? `[${title}](${b.url})` : title;
      const langs = b.programming_languages.length > 0 ? ` \`${b.programming_languages.join(",")}\`` : "";
      const trying = b.trying_usernames.length > 0 ? ` (⏳${b.trying_usernames.length} trying)` : "";
      return `- **$${fmt(b.amount_usd)}** — ${link} *(${b.org_name ?? "?"})*${langs}${trying}`;
    })
    .join("\n");

  const section = [
    START,
    "",
    `_Last updated: ${now}_`,
    "",
    `**Tracked total:** ${bounties.length} / **$${fmt(total)}** | **Truly available:** ${available.length} / **$${fmt(availableTotal)}**`,
    "",
    "### 🟢 Truly available (unclaimed, by reward)",
    "",
    availableList || "_none right now_",
    "",
    "### Top repos (by total reward)",
    "",
    topRepos(bounties),
    "",
    "### Top languages (by total reward)",
    "",
    topLanguages(bounties),
    "",
    "### Latest 20 (with status)",
    "",
    bounties
      .slice(0, 20)
      .map((b) => {
        const title = b.title ?? "(no title)";
        const link = b.url ? `[${title}](${b.url})` : title;
        return `- ${statusBadge(b)} **$${fmt(b.amount_usd)}** — ${link} *(${b.org_name ?? "?"})*`;
      })
      .join("\n"),
    "",
    END,
  ].join("\n");

  const readme = readFileSync(readmePath, "utf-8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  let next: string;
  if (startIdx >= 0 && endIdx > startIdx) {
    next = readme.slice(0, startIdx) + section + readme.slice(endIdx + END.length);
  } else {
    next = readme.trimEnd() + "\n\n## Current snapshot\n\n" + section + "\n";
  }
  writeFileSync(readmePath, next);
  console.log(`README updated: ${bounties.length} bounties, $${fmt(total)}`);
}

main();
