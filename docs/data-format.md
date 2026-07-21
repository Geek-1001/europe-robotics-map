# Company data format

The directory is the JSON array in `src/data/companies.json`. A useful contribution only needs the company basics, its website, and one European location. Everything under `options` is optional.

## Minimal company

```json
{
  "id": "example-robotics",
  "name": "Example Robotics",
  "description": "Builds autonomous robots for inspecting renewable energy infrastructure.",
  "categories": ["Inspection", "Autonomous mobile robots"],
  "addedAt": "2026-07-21",
  "links": {
    "website": "https://example.com/"
  },
  "locations": [
    {
      "id": "example-robotics-berlin",
      "type": "headquarters",
      "city": "Berlin",
      "country": "Germany",
      "address": "Berlin, Germany",
      "coordinates": [13.405, 52.52]
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
| `addedAt` | Date the entry joined the collection, formatted `YYYY-MM-DD`. |
| `links.website` | The only required link. Use the canonical HTTPS company URL. |
| `links.careers` | Optional direct careers page. |
| `links.logo` | Optional HTTPS image or favicon URL. The UI falls back to initials if it is omitted or fails to load. |
| `options.founded` | Optional four-digit founding year. |
| `options.employees` | Optional public range such as `1–10`, `11–50`, `51–200`, or `201–500`. |
| `options.funding.amount` | Optional disclosed funding in millions, not valuation. Include a three-letter `currency` when using it. |
| `options.remoteHiring` | Optional boolean: `true` for remote-friendly, `false` for onsite-only. |
| `locations[].type` | `headquarters`, `office`, or `factory`. |
| `locations[].coordinates` | `[longitude, latitude]`, matching GeoJSON and MapLibre order. |

Run `pnpm validate:data` after editing. The formal schema is available at `schema/company.schema.json` for editor integrations.
