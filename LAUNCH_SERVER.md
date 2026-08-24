# Launch the Server

When asked to **Launch the server**, use this runbook from `C:\Dev\URS-DMS`.

## What It Starts

- Docker PostgreSQL, MinIO, Redis, and the URS-DMS backend
- A Vite frontend for local access
- Cloudflare HTTP/2 quick tunnels for the frontend, backend, MinIO, and console
- Fresh environment values for the current tunnel URLs

## Launch

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tunnel-all.ps1
```

The script performs health checks before starting. It recreates the backend
after updating `MINIO_PUBLIC_ENDPOINT`, so presigned upload and download URLs
always use the current MinIO tunnel instead of an expired URL.

For the local frontend, open the app URL printed by the script. The backend
health endpoint is:

```text
<Backend tunnel>/api/v1/health
```

## Cloudflare Pages

After the script prints a new backend URL, deploy the frontend build with that
URL embedded:

```powershell
npm --prefix client run build
npx wrangler pages deploy client/dist --project-name urs-dms --branch main --commit-dirty=true
```

The script also writes the current value to `client/.env` as
`VITE_API_BASE=<Backend tunnel>/api/v1`.

## Verify Storage

Confirm all of these before using uploads:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:4000/api/v1/health
Invoke-WebRequest <MinIO tunnel>/minio/health/live -UseBasicParsing
```

The API health response must report `services.minio.status` as `up`. If the
frontend reports storage unavailable, do not reuse an old tunnel URL. Rerun the
launch command so MinIO, the API, and the client are synchronized.

## Stop

```powershell
powershell -ExecutionPolicy Bypass -File .\tunnel-stop.ps1
```

Quick Tunnel URLs are temporary. A new launch may produce different URLs, so
the Pages build must be redeployed after each launch when it uses the direct
backend URL.
