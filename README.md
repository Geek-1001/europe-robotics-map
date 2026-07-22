# Europe Robotics Map

An open, community-maintained map of robotics and robotics-adjacent companies across Europe, with a practical focus on offices, factories, remote work and hiring.

The site is a static [Astro](https://astro.build/) project. The directory lives in one reviewable JSON file, while the interactive search and map are a small React island. The map uses [MapLibre GL JS](https://maplibre.org/) and [OpenFreeMap](https://openfreemap.org/).

## What is included

- Interactive map with company-logo markers and automatic geographic clustering
- Remote-friendly hiring indicators
- Company, website and category search
- Multi-category, country, team-size and remote-hiring filters
- Sorting by name, founded year and funding
- Mobile list/map views
- Company detail cards with careers links and European locations
- JSON validation, CI, Netlify configuration and contribution templates

## Local development

Install [mise](https://mise.jdx.dev/), then run:

```sh
mise trust
mise run setup
mise run dev
```

The site will be available at `http://localhost:4321`.

If Node and pnpm are already installed, `pnpm install && pnpm dev` works too.

## Data

All company records live in [`src/data/companies.json`](src/data/companies.json). Contributors provide an exact street address or just a city; coordinates are generated and cached automatically. Pull requests verify every resolved marker, and the merge workflow persists new coordinates in [`src/data/geocode-cache.json`](src/data/geocode-cache.json). See [`docs/data-format.md`](docs/data-format.md) for the full field guide.

Validate a contribution before opening a pull request:

```sh
pnpm validate:data
pnpm build
```

## Deploying to Netlify

Import the repository into Netlify. The included `netlify.toml` configures `pnpm build`, publishes `dist`, and sets the expected Node/pnpm versions. Deploy previews will be generated automatically for pull requests when enabled in the Netlify project.

## Contributing

Suggestions, corrections and new companies are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), then open a pull request. A canonical company website is enough to get started.

## Licensing

Source code is available under the [MIT License](LICENSE). Directory data in `src/data/companies.json` is released under [CC0 1.0](DATA_LICENSE).
