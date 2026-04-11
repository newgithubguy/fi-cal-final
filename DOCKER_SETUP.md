# Docker Setup Guide - Finance Calendar Mobile

Use this guide to run the mobile project in Docker.

## GitHub Container Registry (Recommended)

This project publishes a container image to GitHub Container Registry (GHCR):

- `ghcr.io/newgithubguy/fi-cal-final:latest`

Login once if the image is private:

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Quick Start

Optional: create a local environment override from the template.

```bash
cd /path/to/fi-cal-final
cp .env.example .env
```

On PowerShell:

```powershell
cd C:\path\to\fi-cal-final
Copy-Item .env.example .env
```

```bash
cd /path/to/fi-cal-final
docker compose pull
docker compose up -d
```

Access:
- Local: http://localhost:8081
- Network: http://YOUR_MACHINE_IP:8081

## Stop

```bash
docker compose down
```

## Logs

```bash
docker compose logs -f
```

## Data Persistence

- SQLite path in container: `/data/finance.db`
- Docker volume: `finance-calendar-mobile-data`

## Rebuild After Updates

If you are using GHCR image deploys:

```bash
cd /path/to/fi-cal-final
git pull origin main
docker compose pull
docker compose up -d
```

If you are developing locally and need a local image rebuild:

```bash
cd /path/to/fi-cal-final
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
```

### GitHub + Docker Update Checklist

```bash
cd /path/to/fi-cal-final
git fetch origin
git pull origin main
docker compose pull
docker compose up -d
```

Then hard refresh your browser:
- Windows/Linux: Ctrl + Shift + R or Ctrl + F5
- Mac: Cmd + Shift + R

## Recent Updates

- Account color customization: Assign colors to accounts for better organization
- Payee & Description manager: Edit or delete saved payees and descriptions
- Keyboard calculator input support
- Highlighted-day sidebar transactions
- Compact side-by-side workspace panels below the calendar
- Income/Expense type selector with color-coded dropdown
