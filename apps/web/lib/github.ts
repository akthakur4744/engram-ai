// Unauthenticated GitHub REST access — public repos only. No token anywhere in this
// module. Unauthenticated requests are capped at 60/hour per IP by GitHub; if that
// becomes a problem, a server-side-only GITHUB_TOKEN env var could raise it without
// any UI change, but that's not needed for this pass.

export interface ParsedPR {
  owner: string;
  repo: string;
  number: number;
}

const PR_URL_RE = /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;
const PR_SHORTHAND_RE = /^([^/\s#]+)\/([^/\s#]+)#(\d+)$/;

export function parsePRUrl(input: string): ParsedPR {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(PR_URL_RE);
  if (urlMatch) {
    const [, owner, repo, number] = urlMatch as [string, string, string, string];
    return { owner, repo: repo.replace(/\.git$/, ""), number: Number(number) };
  }

  const shorthandMatch = trimmed.match(PR_SHORTHAND_RE);
  if (shorthandMatch) {
    const [, owner, repo, number] = shorthandMatch as [string, string, string, string];
    return { owner, repo, number: Number(number) };
  }

  throw new Error("Enter a GitHub PR URL like https://github.com/owner/repo/pull/123");
}

const MAX_DIFF_BYTES = 5 * 1024 * 1024;

export async function fetchPRDiff(owner: string, repo: string, number: number): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "PR not found — check the URL, or the repo may be private (only public repos are supported right now).",
      );
    }
    if (res.status === 403) {
      throw new Error("GitHub rate limit exceeded for unauthenticated requests — try again in a bit.");
    }
    throw new Error(`GitHub API error (status ${res.status})`);
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_DIFF_BYTES) {
    throw new Error("PR diff is too large to review.");
  }

  return res.text();
}
