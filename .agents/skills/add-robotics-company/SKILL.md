---
name: add-robotics-company
description: Research, verify, and add a robotics company to the Europe Robotics Map from a company URL or name. Use when asked to add, onboard, or update a company in `src/data/companies.json`, including validating reachable website, careers, logo, and source URLs; researching its description, categories, founding year, team size, latest publicly announced funding round, remote-hiring policy, and European locations; and generating its geocode-cache entry.
---

# Add Robotics Company

Add one researched company to the repository’s canonical data files and verify the resulting map location.

## Workflow

1. Read `AGENTS.md`, `docs/data-format.md`, `schema/company.schema.json`, `scripts/geocode-locations.mjs`, and `scripts/validate-companies.mjs`. Inspect nearby records in `src/data/companies.json` for current formatting and vocabulary.
2. Check `git status --short` and preserve unrelated user changes.
3. Search `src/data/companies.json` by company name, likely ID, and canonical domain. Stop and explain if the company already exists unless the user asked to update it.
4. Research the fields below. Browse the web because company facts, hiring, and funding change over time. Prefer first-party sources, then investor announcements, reputable reporting, and structured company databases.
5. Directly open and validate every URL that will be stored or cited. Follow redirects and verify both reachability and expected content using the rules below. Do not rely on a search-result snippet or guessed URL.
6. Reconcile conflicting sources using the rules below. Omit uncertain optional fields instead of guessing.
7. Add the company with `apply_patch`. Preserve the file’s existing order and local formatting.
8. Re-open the exact stored website, careers, and logo URLs after editing to ensure no transcription or escaping error was introduced.
9. Run `mise exec -- pnpm validate:data`. This is the authoritative way to generate or refresh `src/data/geocode-cache.json`; allow its Nominatim request when required.
10. Inspect the generated cache entry and confirm its `[longitude, latitude]` is plausible for the stated city and address. Never type coordinates into the cache manually. If geocoding fails or resolves to the wrong place, refine the public address and rerun the command; never invent coordinates.
11. Run `git diff --check` and `mise run check`. Do not start or manage the Astro development server.
12. Review the final diff for unintended changes. Report the added fields, funding conclusion, coordinates, link-validation results, project validation results, and source links. Do not commit or push unless explicitly requested.

## Research Fields

### Identity and description

- Use a stable lowercase kebab-case `id`.
- Use the company’s canonical HTTPS website.
- Write one neutral, factual sentence describing what its robots do and where they are used. Keep it under 180 characters when practical.
- Choose only reusable category labels already present in `src/data/companies.json`. Add a new category only when no existing label accurately describes the company.

### Links

- Prefer the company’s direct careers page over a generic jobs platform or homepage.
- Prefer an official, stable HTTPS logo or favicon URL. Use a user-supplied icon when provided, but validate it by the same rules as a discovered URL. Otherwise inspect the official site’s icon metadata or media library.
- Omit careers or logo links when a reliable direct URL cannot be verified.

### Link verification

Treat URL validation as a required gate, not a best-effort check.

- Open each candidate with an available web, browser, or HTTP tool. Use a real GET request when possible because HEAD behavior may differ. Follow redirects and prefer the stable final HTTPS URL without tracking parameters.
- Accept a URL only when it resolves successfully and the returned content matches its intended role. A successful status alone is insufficient.
- For `links.website`, confirm the page identifies the intended company and describes its relevant product or business. Reject parked domains, unrelated namesakes, generic directories, soft 404s, and pages whose visible content belongs to another company.
- For `links.careers`, confirm the page contains the intended company’s careers, vacancies, open roles, or company-specific applicant-tracking context. Reject generic ATS homepages, empty search pages, unrelated job listings, login walls, and redirects to a generic homepage.
- For `links.logo`, confirm the final response is an actual usable image: an `image/*` content type or an image that can be decoded/rendered. Accept SVG only when it is valid SVG image content. Reject HTML/XML error documents, access-denied pages, placeholders, tracking pixels, and unrelated images even if they return `200`.
- Verify a user-supplied URL too. User input is authoritative intent, not proof that the resource is reachable or appropriate.
- Directly open evidence URLs used for founding year, team size, funding, remote policy, or address and confirm the page contains the claimed context. Do not cite a search snippet as if the underlying page were inspected.
- If one tool is blocked by bot protection, try another permitted browser or HTTP method. Do not treat tool failure as proof that the URL is invalid.
- If an optional careers or logo URL cannot be verified, find another official candidate or omit the field and report why. If the required company website cannot be verified with any available method, stop before editing and report the blocker rather than storing an unverified URL.

### Company facts

- Record `options.founded` only when a credible source supports the year.
- Convert an exact team count to an employee band already used by the data set, such as `1–10`, `11–50`, `51–200`, or `201–500`.
- Prefer a user-provided current team count, then the company’s team/careers page, then a reputable current estimate.
- Set `remoteHiring` only with explicit evidence. Flexible hours alone are not evidence of remote work; a stated remote or hybrid option is.

### Funding

- Find the latest publicly announced company financing round, not a valuation and not the budget of a program the company joined.
- Prefer the company or lead investor’s announcement. Cross-check with reputable reporting or a structured funding database when the round label or date is unclear.
- Store the round label in `options.funding.stage`.
- Store `amount` in millions and include the original three-letter `currency`. Do not convert currencies unless the source itself reports the converted amount.
- If a round is confirmed but its amount is undisclosed, include only `stage`.
- Do not substitute cumulative funding for the latest round amount. Do not infer an amount from share filings, program totals, awards, or similarly named companies.
- If no public financing round can be verified, omit `funding` and explain the research result.

### Locations and geocoding

- Include at least one European location, normally the headquarters.
- Add all clearly published European headquarters, offices, and factories that are meaningful map locations. Do not add customer, partner, demonstration, or temporary project sites.
- Prefer the company’s contact page, careers page, official filings, or investor announcement for the address.
- Use the repository’s existing country names and location types: `headquarters`, `office`, or `factory`.
- Include a public street address when known. Otherwise provide only city and country so the project can generate an approximate marker.
- Create a unique location ID in the form `<company-id>-<city>`.
- Let `scripts/geocode-locations.mjs` produce the coordinate cache query and coordinates. Treat the cache as generated data.

## Evidence and Conflict Rules

- Treat explicit user-provided facts as task inputs, but flag material conflicts with newer first-party evidence. If both values map to the same stored range, use that range without blocking.
- Prefer the newest dated first-party source for mutable facts.
- Distinguish an announcement date from a database’s transaction or indexing date.
- When sources disagree on founding year, funding stage, or location, state which source was chosen and why.
- Never fill optional fields with `null`, placeholders, estimates presented as facts, or undisclosed funding amounts.

## Example Invocations

- “Use `$add-robotics-company` to add https://example-robotics.com.”
- “Add Example Robotics. Their careers page is …, they have 28 employees, and this is their icon …”
- “Research and add this robotics company, including its latest funding and exact headquarters marker.”
