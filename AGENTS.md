# Agent instructions

## Development server

- Do not start, restart, or otherwise manage the Astro development or preview server unless the user explicitly asks you to do so.
- Assume the user manages the development server and that it is available at `http://localhost:4321` when browser-based verification is needed.
- If that address is unavailable, report it instead of starting a server automatically.
- The user can start the project with `mise run dev` or, when the mise environment is already active, `pnpm dev`.
