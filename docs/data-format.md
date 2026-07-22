# Company data format

The directory is the JSON array in `src/data/companies.json`. A useful contribution only needs the company basics, its website, and one European location. Everything under `options` is optional.

## Minimal company

```json
{
  "id": "example-robotics",
  "name": "Example Robotics",
  "description": "Builds autonomous robots for inspecting renewable energy infrastructure.",
  "categories": ["Inspection", "Autonomous mobile robots"],
  "links": {
    "website": "https://example.com/"
  },
  "locations": [
    {
      "id": "example-robotics-berlin",
      "type": "headquarters",
      "city": "Berlin",
      "country": "Germany"
    }
  ]
}
```

## Optional links and company facts

Add any details you know; omit the rest rather than filling fields with `null`.

```json
{
  "links": {
    "website": "https://example.com/",
    "careers": "https://example.com/careers",
    "logo": "https://example.com/logo.png"
  },
  "options": {
    "founded": 2022,
    "employees": "11–50",
    "funding": {
      "stage": "Seed",
      "amount": 4.5,
      "currency": "EUR"
    },
    "remoteHiring": true
  }
}
```

`remoteHiring: true` means remote-friendly hiring; `false` means onsite-only. If the policy is unclear, omit the field.

## Field notes

| Field | Requirement |
| --- | --- |
| `id` | Stable, unique, lowercase kebab-case identifier. |
| `description` | One factual sentence, ideally under 180 characters. |
| `categories` | One or more reusable, title-case labels. Companies can have multiple categories. |
| `links.website` | The only required link. Use the canonical HTTPS company URL. |
| `links.careers` | Optional direct careers page. |
| `links.logo` | Optional HTTPS image or favicon URL. The UI falls back to initials if it is omitted or fails to load. |
| `options.founded` | Optional four-digit founding year. |
| `options.employees` | Optional public range such as `1–10`, `11–50`, `51–200`, or `201–500`. |
| `options.funding.amount` | Optional disclosed funding in millions, not valuation. Include a three-letter `currency` when using it. |
| `options.remoteHiring` | Optional boolean: `true` for remote-friendly, `false` for onsite-only. |
| `locations[].type` | `headquarters`, `office`, or `factory`. |
| `locations[].address` | Add the public street address when known. Omit it when only the city is known. |

## Exact and approximate locations

For an exact location, include its address:

```json
{
  "id": "example-robotics-munich",
  "type": "office",
  "city": "Munich",
  "country": "Germany",
  "address": "Example-Straße 12, 80331 Munich"
}
```

When only a city is known, omit `address`. Do not add coordinates or an approximation flag. During validation and builds, the project geocodes new cities automatically and generates a stable, pseudo-random point nearby. Generated points are kept apart from existing markers and are labelled as approximate in the interface.

Exact addresses are geocoded through the same process. Results are cached under the hood so ordinary builds do not make network requests, and changing an address automatically invalidates its cached result. Contributors never edit coordinates or the cache themselves.

Pull-request CI resolves uncached locations, validates every generated coordinate and builds the complete map. After merge, a separate workflow repeats those checks and commits only the refreshed `src/data/geocode-cache.json` file to `main`. The generated commit does not retrigger the workflow.

The default geocoder endpoint is OpenStreetMap Nominatim. Requests are sequential, limited to less than one per second and only made for uncached or changed locations. Deployments can switch providers by setting `ROBOMAP_GEOCODER_URL` to a compatible search endpoint.

Run `pnpm validate:data` after editing. The formal schema is available at `schema/company.schema.json` for editor integrations.
