# Azure deployment guide (Dev)

The site is deployed as a single Azure App Service (Linux, Node 20) that serves both the REST API
and the built React SPA, matching ADR-4 of the [architecture design](architecture-design.md).

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`ci.yml`](../.github/workflows/ci.yml) | pull requests, pushes to `main` | Install, lint, type-check, test, build and audit production dependencies |
| [`azure-deploy-dev.yml`](../.github/workflows/azure-deploy-dev.yml) | pushes to `main`, manual dispatch | Build the deployment package and deploy it to the Dev App Service |

The deployment job runs in the GitHub `Dev` environment, so approvals and protection rules can be
enforced there.

## One-time Azure setup

1. Create the Dev resource group, Linux App Service plan and Web App (Node 20 LTS runtime).
2. Create a Microsoft Entra app registration and configure a **federated credential** for this
   repository (OpenID Connect). No publish profile or client secret is stored in GitHub.
3. Grant the identity the `Website Contributor` role on the Web App.
4. Optionally place the Web App behind Azure API Management for gateway-level rate limiting and
   observability.

## Required GitHub configuration

| Name | Kind | Description |
| --- | --- | --- |
| `AZURE_CLIENT_ID` | secret | Entra application (client) ID used for OIDC login |
| `AZURE_TENANT_ID` | secret | Entra tenant ID |
| `AZURE_SUBSCRIPTION_ID` | secret | Target subscription ID |
| `AZURE_WEBAPP_NAME` | variable | Name of the Dev Web App |
| `AZURE_WEBAPP_SLOT_NAME` | variable (optional) | Deployment slot, defaults to `production` |

## App Service settings

| Setting | Value |
| --- | --- |
| Startup command | `node dist/index.js` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `PORT` | provided automatically by App Service |
| `ALLOWED_ORIGINS` | leave empty for same-origin hosting |
| `RATE_LIMIT_MAX` | `120` (tune per environment) |

Secrets required by any future third-party weather API must be stored in Azure Key Vault and
referenced from App Service settings — never committed to the repository.

## Deployment package

The build job produces a `release/` folder containing:

- `dist/` – the compiled API, the validated dataset and the built SPA in `dist/public`;
- `package.json` – used by App Service to start the app;
- `node_modules/` – production dependencies only (`npm install --omit=dev`).

## Verification

After deployment the workflow polls `https://<app>.azurewebsites.net/api/health` until it returns
`200` (up to five attempts). A successful response looks like:

```json
{ "status": "ok", "states": 51 }
```

If the dataset fails validation the endpoint returns `503` with `{"status":"degraded"}` and the
deployment is marked as failed.

## Rollback

Re-run the previous successful `Deploy to Azure App Service (Dev)` workflow run, or swap back the
deployment slot if slots are enabled.
