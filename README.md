# OSS Maintainer Desk

OSS Maintainer Desk is a local-first dashboard for open source maintainers. It turns a GitHub issue and pull request queue into a practical weekly maintainer brief: stale items, unlabeled work, review bottlenecks, release candidates, and a ready-to-share Markdown report.

The app is intentionally static and dependency-free. You can open it from disk, host it on GitHub Pages, or embed it in a project docs site.

## What it does

- Fetches open issues and pull requests from the GitHub REST API.
- Works without a token for public repositories, with an optional token for higher rate limits.
- Flags stale issues, unlabeled work, unassigned items, and pull requests that need attention.
- Builds a prioritized maintainer queue and a weekly Markdown brief.
- Generates a copy-ready AI prompt for maintainers who want to refine the brief with OpenAI or another assistant.
- Keeps tokens and generated text in browser memory only. Nothing is stored by the app.

## Quick start

Open [index.html](./index.html) in a browser.

If your browser blocks local scripts from `file://`, run the included static server from PowerShell:

```powershell
.\tools\serve.ps1 -Port 8765
```

Then open `http://localhost:8765`.

For a public repository:

1. Enter `owner/repo`, for example `openai/openai-python`.
2. Leave the GitHub token blank unless you need higher rate limits.
3. Select `Analyze repository`.
4. Copy or download the generated brief.

If you do not want to call GitHub yet, select `Load sample`.

## Hosting

Because this is a static app, any static host works:

- GitHub Pages
- Netlify
- Cloudflare Pages
- A project documentation site

No build step is required.

## Privacy

See [docs/privacy.md](./docs/privacy.md). In short: all analysis runs in the browser, API tokens stay in memory, and the generated brief is only sent elsewhere if you copy it or use another tool yourself.

## Roadmap

- Repository health history saved as downloadable JSON.
- Optional maintainer profiles for project-specific triage policies.
- Label suggestion presets for popular OSS workflows.
- GitHub Actions workflow that publishes a weekly brief to an issue or discussion.
- Optional server-side OpenAI Responses API integration for teams that do not want browser-held API keys.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
