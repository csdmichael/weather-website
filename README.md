# Weather by State

Responsive website that shows long-term average temperature and precipitation for every US state
and the District of Columbia.

The implementation follows the approved [architecture design](docs/architecture-design.md) and the
[requirements analysis](docs/requirements-analysis.md).

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript, built with Vite |
| Backend | Node.js 20+ with Express 5 (TypeScript) |
| Data | Validated, cached static JSON dataset (NOAA statewide normals) |
| Tests | Vitest, Testing Library, supertest |
| CI/CD | GitHub Actions → Azure App Service (Dev) |

The repository is an npm workspace with two packages:

```
client/   React single page application
server/   Express REST API + static hosting of the built SPA
docs/     Intake documents, architecture, data and deployment guides
```

## Getting started

```bash
npm install          # install workspace dependencies
npm run dev          # start the API (http://localhost:3001) and the SPA (http://localhost:5173)
```

The Vite dev server proxies `/api` requests to the API, so no CORS configuration is required
locally.

## Common scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and SPA dev servers |
| `npm run build` | Build the SPA, compile the API and bundle the SPA into `server/dist/public` |
| `npm test` | Run the API and SPA test suites |
| `npm run lint` | Type-check both packages and lint the SPA |
| `npm start` | Serve the production build from `server/dist` |

After `npm run build`, `npm start` serves the SPA and API together on `http://localhost:3001`.

## API

All responses are JSON. See [docs/architecture-design.md](docs/architecture-design.md) for the
approved contract.

| Method | Path | Description | Status codes |
| --- | --- | --- | --- |
| GET | `/api/health` | Service and dataset health | 200, 503 |
| GET | `/api/states` | All states with their abbreviations | 200, 503 |
| GET | `/api/weather/:stateAbbr` | Weather averages for a state | 200, 400, 404, 503 |

Example:

```bash
curl http://localhost:3001/api/weather/CA
{
  "state": "California",
  "abbreviation": "CA",
  "average_temperature_f": 59.9,
  "average_precipitation_in": 22.2,
  "source": "NOAA NCEI Climate at a Glance, statewide annual averages (1991-2020 normals)"
}
```

Errors use a consistent envelope: `{ "error": { "code": "STATE_NOT_FOUND", "message": "…" } }`.

## Configuration

Copy `server/.env.example` to `server/.env` (and `client/.env.example` to `client/.env`) and adjust
as needed. All variables are optional and have safe defaults.

| Variable | Package | Default | Description |
| --- | --- | --- | --- |
| `PORT` | server | `3001` | HTTP port |
| `ALLOWED_ORIGINS` | server | _(empty)_ | Comma separated CORS origins for `/api`; same-origin only when empty |
| `RATE_LIMIT_MAX` | server | `120` | Requests per IP per minute for `/api` |
| `CLIENT_DIST_DIR` | server | `dist/public` | Directory containing the built SPA |
| `VITE_API_BASE_URL` | client | _(empty)_ | API origin; empty means same origin |
| `VITE_DEV_API_TARGET` | client | `http://localhost:3001` | Dev proxy target |

## Security

- `helmet` security headers, `x-powered-by` disabled and per-IP rate limiting on `/api`.
- Every dataset record is validated and normalised before it is served (see the threat model in the
  architecture document).
- Path parameters are validated against a strict pattern; unknown states return `404`.
- No authentication, personal data or secrets are handled by the application.

## Documentation

- [Requirements](docs/intake/requirements/weather-website-requirements.md)
- [Requirements analysis](docs/requirements-analysis.md)
- [Architecture design](docs/architecture-design.md)
- [Weather data source and update process](docs/data-source.md)
- [Azure deployment guide](docs/deployment.md)

## License

[MIT](LICENSE)
