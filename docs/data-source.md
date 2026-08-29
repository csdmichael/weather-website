# Weather data source and update process

## Source

Average weather values are stored in
[`server/src/data/state-weather-averages.json`](../server/src/data/state-weather-averages.json).

- **Provider:** NOAA National Centers for Environmental Information (NCEI), Climate at a Glance –
  statewide time series (1991–2020 climate normals).
- **Coverage:** the 50 US states plus the District of Columbia.
- **Fields per record:**

  | Field | Type | Description |
  | --- | --- | --- |
  | `state` | string | Full state name |
  | `abbreviation` | string | Two-letter USPS abbreviation (upper case) |
  | `average_temperature_f` | number | Annual average temperature in °F |
  | `average_precipitation_in` | number | Annual average precipitation in inches |

  The dataset-level `source` value is attached to every API response as the `source` field, so
  consumers always see the provenance of the numbers.

The values are rounded to one decimal place and are intended for informational comparison only, not
for operational or scientific use.

## Why a static dataset

ADR-3 of the [architecture design](architecture-design.md) selects a static dataset for the MVP so
that the site never depends on a third-party API being reachable. `WeatherRepository` is the single
data access point, so a future live-API adapter only needs to implement the same interface.

## Validation

The dataset is *not* trusted verbatim. On first use every record passes through
`parseRecord`, which enforces:

- a plausible state name (letters, spaces, `.`, `'` and `-` only, max 50 characters);
- an upper-case two-letter abbreviation;
- finite numeric temperature between −100 °F and 150 °F;
- finite numeric precipitation between 0 in and 500 in;
- removal of any additional properties present in the file.

Invalid records are dropped. If no valid record remains, the API returns `503 DATA_UNAVAILABLE`
instead of serving unverified data.

## Updating the dataset

1. Download the latest statewide annual averages from
   <https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series>.
2. Update the values, the `source` string and `retrievedOn` in
   `server/src/data/state-weather-averages.json`.
3. Run `npm test` — the repository and API tests assert the record count (51) and the shape of each
   record.
4. Open a pull request describing the source release that was used.
