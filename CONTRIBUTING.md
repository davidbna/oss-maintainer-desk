# Contributing

Thanks for considering a contribution to OSS Maintainer Desk.

## Useful contributions

- Better triage heuristics for issue queues.
- Accessibility and keyboard navigation improvements.
- GitHub API edge case fixes.
- Maintainer workflow templates for specific ecosystems.
- Documentation from real-world usage.

## Development

This project has no build step. Open `index.html` directly in a browser.

When changing behavior, prefer small, focused edits and include a manual test note in the pull request:

- Repository tested.
- Browser tested.
- Before/after behavior.

## Project standards

- Keep the app static and dependency-free unless a dependency removes real complexity.
- Do not persist tokens or generated analysis in local storage.
- Keep generated briefs factual and easy for maintainers to edit.
- Avoid sending repository data to any third party without an explicit user action.
