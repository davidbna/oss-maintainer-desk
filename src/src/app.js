(function () {
  const desk = window.MaintainerDesk;
  const form = document.getElementById("repo-form");
  const repoInput = document.getElementById("repo-input");
  const tokenInput = document.getElementById("token-input");
  const sampleButton = document.getElementById("sample-button");
  const statusText = document.getElementById("status-text");
  const metricGrid = document.getElementById("metric-grid");
  const healthBand = document.getElementById("health-band");
  const queueList = document.getElementById("queue-list");
  const briefOutput = document.getElementById("brief-output");
  const briefMeta = document.getElementById("brief-meta");
  const copyButton = document.getElementById("copy-button");
  const downloadButton = document.getElementById("download-button");
  const promptMode = document.getElementById("prompt-mode");
  const promptButton = document.getElementById("prompt-button");
  const promptOutput = document.getElementById("prompt-output");
  const template = document.getElementById("queue-item-template");

  let currentAnalysis = null;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runAnalysis(() => desk.fetchGitHubQueue(repoInput.value, tokenInput.value.trim()));
  });

  sampleButton.addEventListener("click", async () => {
    await runAnalysis(() => Promise.resolve(desk.sampleData()));
  });

  copyButton.addEventListener("click", async () => {
    if (!briefOutput.value.trim()) return;
    await navigator.clipboard.writeText(briefOutput.value);
    setStatus("Copied Markdown to clipboard.");
  });

  downloadButton.addEventListener("click", () => {
    if (!briefOutput.value.trim()) return;
    const blob = new Blob([briefOutput.value], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    const repo = currentAnalysis ? currentAnalysis.repo.replace("/", "-") : "maintainer-brief";
    link.href = URL.createObjectURL(blob);
    link.download = repo + "-brief.md";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  promptButton.addEventListener("click", () => {
    const markdown = briefOutput.value.trim();
    if (!markdown) {
      promptOutput.value = "Generate a maintainer brief first.";
      return;
    }
    promptOutput.value = desk.buildPrompt(markdown, promptMode.value);
    setStatus("Prompt prepared.");
  });

  async function runAnalysis(loader) {
    setStatus("Fetching repository data...");
    try {
      const data = await loader();
      currentAnalysis = desk.analyzeQueue(data);
      renderAnalysis(currentAnalysis);
      setStatus("Analysis complete.");
    } catch (error) {
      setStatus(error.message || "Analysis failed.");
    }
  }

  function renderAnalysis(analysis) {
    metricGrid.innerHTML = "";
    [
      ["Open issues", analysis.metrics.issues],
      ["Open PRs", analysis.metrics.pulls],
      ["Stale", analysis.metrics.stale],
      ["Unlabeled", analysis.metrics.unlabeled]
    ].forEach(([label, value]) => {
      const metric = document.createElement("div");
      metric.className = "metric";
      metric.innerHTML = "<strong>" + value + "</strong><span>" + label + "</span>";
      metricGrid.appendChild(metric);
    });

    renderHealthBand(analysis.metrics.healthScore);
    renderQueue(analysis.queue);
    briefOutput.value = desk.buildMarkdown(analysis);
    briefMeta.textContent = analysis.repo + " - health score " + analysis.metrics.healthScore + "/100";
    promptOutput.value = "";
  }

  function renderHealthBand(score) {
    healthBand.innerHTML = "";
    const riskTiles = Math.max(0, Math.ceil((100 - score) / 10));
    for (let index = 0; index < 12; index += 1) {
      const tile = document.createElement("span");
      const tone = index < 12 - riskTiles ? "good" : riskTiles > 5 ? "risk" : "watch";
      tile.className = "health-tile " + tone;
      healthBand.appendChild(tile);
    }
  }

  function renderQueue(items) {
    queueList.innerHTML = "";
    items.forEach((item) => {
      const node = template.content.cloneNode(true);
      node.querySelector(".queue-title").textContent = item.title;
      node.querySelector(".queue-detail").textContent = item.detail;
      const severity = node.querySelector(".severity");
      severity.textContent = item.severity;
      severity.classList.add(item.severity);
      queueList.appendChild(node);
    });
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  runAnalysis(() => Promise.resolve(desk.sampleData()));
})();
