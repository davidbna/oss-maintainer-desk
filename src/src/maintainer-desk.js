(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MaintainerDesk = factory();
  }
})(typeof self !== "undefined" ? self : globalThis, function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const STALE_DAYS = 30;

  const sampleIssues = [
    makeIssue(101, "Crash when config file is empty", "bug", 41, 1, []),
    makeIssue(102, "Add guide for pnpm workspace users", "documentation", 8, 0, ["docs"]),
    makeIssue(103, "Label request: good first issue for CLI output", "", 12, 0, []),
    makeIssue(104, "Improve release checklist", "enhancement", 3, 2, ["help wanted"]),
    makeIssue(105, "Need repro for Windows path handling", "bug", 55, 0, ["needs info"])
  ];

  const samplePulls = [
    makePull(201, "Fix empty config crash", 5, 2, ["bug"], false),
    makePull(202, "Add contributor quickstart", 2, 0, ["docs"], false),
    makePull(203, "Refactor release note renderer", 18, 4, [], false)
  ];

  function makeIssue(number, title, label, ageDays, comments, labels) {
    return {
      number,
      title,
      html_url: "https://github.com/example/project/issues/" + number,
      state: "open",
      labels: labels.map((name) => ({ name })),
      comments,
      assignees: [],
      created_at: new Date(Date.now() - ageDays * DAY_MS).toISOString(),
      updated_at: new Date(Date.now() - ageDays * DAY_MS).toISOString(),
      body: label ? "Sample " + label + " report." : "Sample issue without labels."
    };
  }

  function makePull(number, title, ageDays, comments, labels, draft) {
    return {
      number,
      title,
      html_url: "https://github.com/example/project/pull/" + number,
      state: "open",
      draft,
      labels: labels.map((name) => ({ name })),
      comments,
      assignees: [],
      created_at: new Date(Date.now() - ageDays * DAY_MS).toISOString(),
      updated_at: new Date(Date.now() - ageDays * DAY_MS).toISOString(),
      body: "Sample pull request.",
      pull_request: {}
    };
  }

  function parseRepo(input) {
    const trimmed = String(input || "").trim();
    const match = trimmed.match(/^(?:https:\/\/github\.com\/)?([^/\s]+)\/([^/\s#?]+)\/?$/i);
    if (!match) {
      throw new Error("Use the format owner/repo or a GitHub repository URL.");
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/i, ""),
      slug: match[1] + "/" + match[2].replace(/\.git$/i, "")
    };
  }

  async function fetchGitHubQueue(repoInput, token) {
    const repo = parseRepo(repoInput);
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const url = "https://api.github.com/repos/" + repo.slug + "/issues?state=open&per_page=100&sort=updated&direction=asc";
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error("GitHub returned " + response.status + " for " + repo.slug + ".");
    }
    const items = await response.json();
    return {
      repo: repo.slug,
      issues: items.filter((item) => !item.pull_request),
      pulls: items.filter((item) => item.pull_request),
      fetchedAt: new Date().toISOString()
    };
  }

  function analyzeQueue(data) {
    const now = Date.now();
    const issues = data.issues || [];
    const pulls = data.pulls || [];
    const all = issues.concat(pulls);

    const staleItems = all.filter((item) => ageInDays(item.updated_at, now) >= STALE_DAYS);
    const unlabeledItems = all.filter((item) => !item.labels || item.labels.length === 0);
    const unassignedItems = all.filter((item) => !item.assignees || item.assignees.length === 0);
    const reviewReadyPulls = pulls.filter((item) => !item.draft && ageInDays(item.updated_at, now) >= 3);
    const needsInfo = issues.filter((item) => labelNames(item).some((name) => /needs[-\s]?info|question/i.test(name)));

    const queue = [];
    if (reviewReadyPulls.length) {
      queue.push(task("Review waiting PRs", reviewReadyPulls.length + " pull requests are open and not draft.", "high"));
    }
    if (staleItems.length) {
      queue.push(task("Close or refresh stale work", staleItems.length + " items have had no update for " + STALE_DAYS + "+ days.", "medium"));
    }
    if (unlabeledItems.length) {
      queue.push(task("Label uncategorized work", unlabeledItems.length + " items need labels before contributors can route them.", "medium"));
    }
    if (needsInfo.length) {
      queue.push(task("Follow up on missing info", needsInfo.length + " issues are waiting on reproduction details or clarification.", "low"));
    }
    if (unassignedItems.length) {
      queue.push(task("Assign ownership", unassignedItems.length + " items have no assignee.", "low"));
    }
    if (!queue.length) {
      queue.push(task("Queue is under control", "No immediate bottlenecks were detected.", "low"));
    }

    const score = Math.max(0, 100 - staleItems.length * 8 - unlabeledItems.length * 5 - reviewReadyPulls.length * 10);
    return {
      repo: data.repo || "sample/project",
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      metrics: {
        issues: issues.length,
        pulls: pulls.length,
        stale: staleItems.length,
        unlabeled: unlabeledItems.length,
        unassigned: unassignedItems.length,
        reviewReadyPulls: reviewReadyPulls.length,
        healthScore: score
      },
      queue,
      topIssues: prioritize(issues, now).slice(0, 6),
      topPulls: prioritize(pulls, now).slice(0, 6),
      labelGaps: unlabeledItems.slice(0, 8),
      staleItems: staleItems.slice(0, 8)
    };
  }

  function task(title, detail, severity) {
    return { title, detail, severity };
  }

  function ageInDays(dateString, now) {
    const time = new Date(dateString || Date.now()).getTime();
    if (Number.isNaN(time)) return 0;
    return Math.floor((now - time) / DAY_MS);
  }

  function labelNames(item) {
    return (item.labels || []).map((label) => label.name || String(label)).filter(Boolean);
  }

  function prioritize(items, now) {
    return items
      .map((item) => {
        const labels = labelNames(item);
        const age = ageInDays(item.updated_at, now);
        const score =
          age +
          (labels.length === 0 ? 20 : 0) +
          (labels.some((name) => /bug|security|regression/i.test(name)) ? 18 : 0) +
          (item.comments || 0) * 2;
        return { item, age, labels, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
  }

  function buildMarkdown(analysis) {
    const lines = [
      "# Maintainer Brief: " + analysis.repo,
      "",
      "Generated: " + formatDate(analysis.fetchedAt),
      "",
      "## Queue Summary",
      "",
      "- Open issues: " + analysis.metrics.issues,
      "- Open pull requests: " + analysis.metrics.pulls,
      "- Stale items: " + analysis.metrics.stale,
      "- Unlabeled items: " + analysis.metrics.unlabeled,
      "- Unassigned items: " + analysis.metrics.unassigned,
      "- Health score: " + analysis.metrics.healthScore + "/100",
      "",
      "## Recommended Actions",
      ""
    ];

    analysis.queue.forEach((item) => {
      lines.push("- " + item.title + " (" + item.severity + "): " + item.detail);
    });

    lines.push("", "## Priority Issues", "");
    pushItems(lines, analysis.topIssues, "issue");
    lines.push("", "## Priority Pull Requests", "");
    pushItems(lines, analysis.topPulls, "PR");
    lines.push("", "## Label Gaps", "");
    pushItems(lines, analysis.labelGaps, "item");
    lines.push("", "## Stale Work", "");
    pushItems(lines, analysis.staleItems, "item");
    lines.push("", "## Suggested Weekly Plan", "");
    lines.push("- Triage unlabeled items first so contributors can self-select work.");
    lines.push("- Review non-draft PRs before opening new implementation work.");
    lines.push("- Ask for reproduction details on needs-info issues, then close inactive items after a documented grace period.");
    lines.push("- Convert repeat questions into documentation tasks.");
    lines.push("");

    return lines.join("\n");
  }

  function pushItems(lines, items, label) {
    if (!items.length) {
      lines.push("- None detected.");
      return;
    }
    items.forEach((item) => {
      const labels = labelNames(item);
      const suffix = labels.length ? " [" + labels.join(", ") + "]" : " [unlabeled]";
      lines.push("- #" + item.number + " " + item.title + suffix + " - " + item.html_url);
    });
  }

  function buildPrompt(markdown, mode) {
    const goals = {
      weekly: "Turn this maintainer brief into a concise weekly update for project contributors.",
      release: "Draft release notes from this maintainer brief. Separate fixes, docs, and maintenance work.",
      contributors: "Create contributor-friendly next actions from this maintainer brief. Prefer clear, small tasks."
    };
    return [
      goals[mode] || goals.weekly,
      "",
      "Rules:",
      "- Preserve issue and pull request numbers.",
      "- Do not invent adoption, sponsorship, benchmarks, or project status.",
      "- Flag uncertainty instead of guessing.",
      "- Keep the result easy for maintainers to edit.",
      "",
      "Maintainer brief:",
      markdown.trim()
    ].join("\n");
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown";
    return date.toISOString().slice(0, 19).replace("T", " ") + " UTC";
  }

  function sampleData() {
    return {
      repo: "example/project",
      issues: sampleIssues,
      pulls: samplePulls,
      fetchedAt: new Date().toISOString()
    };
  }

  return {
    STALE_DAYS,
    parseRepo,
    fetchGitHubQueue,
    analyzeQueue,
    buildMarkdown,
    buildPrompt,
    sampleData
  };
});
