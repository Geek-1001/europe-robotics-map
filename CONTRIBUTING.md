# Contributing to Robomap Europe

Thank you for helping make the map more useful. You can contribute a new company, add an office, correct a fact, improve accessibility, or work on the site itself.

## The easiest route

If you do not want to edit code, open an **Add a company** issue and provide the company website, European location and a one-sentence description. A maintainer can turn that into a data change.

## Adding or updating a company

1. Fork the repository and create a focused branch.
2. Edit `src/data/companies.json`.
3. Follow `docs/data-format.md` and keep descriptions factual and brief.
4. Add the careers or logo link if they are readily available; both are optional.
5. Add the public street address when it is known. If only the city is known, omit `address`; the map places an approximate marker automatically.
6. Run `pnpm validate:data` and `pnpm build`.
7. Open a pull request explaining what changed.

Optional facts belong under `options`. Omit unknown fields rather than guessing or adding `null`. Funding amounts are disclosed funding in millions, not valuation. Employee ranges should use a public range rather than a precise inferred count.

Do not edit `src/data/geocode-cache.json`. Pull-request checks resolve new or changed addresses and cities, validate the resulting markers, and build the complete map. After a pull request is merged, CI commits only the updated generated cache back to `main`.

## Editorial guidelines

- The company must have a meaningful robotics, automation, embodied AI, autonomous-systems or robotics-enabling focus.
- At least one headquarters, office or factory must be in geographic Europe, including the United Kingdom.
- Avoid marketing superlatives. Describe what the company builds.
- Do not copy long descriptions from company websites.
- Link directly to the canonical website, and include a careers page when one is available.
- Keep one company per pull request when possible.

## Code contributions

Use the mise-managed Node and pnpm versions. Keep the site statically deployable, accessible and usable without a proprietary API token. For interface work, include desktop and mobile screenshots in the pull request.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
