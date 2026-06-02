# Privacy

OSS Maintainer Desk is local-first.

## Data flow

- The browser calls the GitHub REST API for the repository you enter.
- If you provide a GitHub token, it is used only for that browser request.
- The app does not store tokens in cookies, local storage, session storage, or a backend.
- The generated maintainer brief stays in the page until you copy it, download it, refresh, or close the tab.

## AI usage

The app creates a copy-ready prompt from the maintainer brief. It does not automatically send data to OpenAI or any other AI provider.

This design is deliberate: many open source maintainers need to inspect what repository data leaves their machine before they use an AI service.

## Hosting note

If you host a modified version that adds analytics, server logging, or direct AI API calls, document that clearly for users.
