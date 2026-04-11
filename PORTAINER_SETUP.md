# Portainer Setup Guide - Finance Calendar Mobile

This guide shows how to deploy the **mobile-friendly** app using Portainer.

## Prerequisites

- Docker installed on the host
- Portainer installed and running
- Access to this repository

## Deploy with a Stack (Recommended)

1. Open Portainer and go to **Stacks**
2. Click **Add Stack**
3. Name it: `finance-calendar-mobile`
4. Paste the stack content from [portainer-stack.yml](portainer-stack.yml)
5. If using a private GHCR image, add registry credentials in Portainer for `ghcr.io`
5. Click **Deploy the stack**

Access the app:
- http://localhost:8081
- http://YOUR_MACHINE_IP:8081

## Stack YAML (copy/paste)

```yaml
services:
  finance-calendar-mobile:
    image: ghcr.io/newgithubguy/fi-cal-final:latest
    container_name: finance-calendar-mobile
    pull_policy: always
    ports:
      - "8081:3000"
    volumes:
      - finance-calendar-mobile-data:/data
    environment:
      - TZ=UTC
      - NODE_ENV=production
      - DB_PATH=/data/finance.db
      - SESSION_SECRET=change-this-to-random-secret-in-production
      - APP_VERSION=1.3.10
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) process.exit(1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  finance-calendar-mobile-data:
    driver: local
```

## Updating in Portainer

1. Go to **Stacks** → `finance-calendar-mobile`
2. Click **Pull and redeploy** (if using Git) or **Update the stack**
3. If updates still do not appear, rebuild image with no cache from CLI

### GitHub + Portainer Update Checklist

1. Confirm the stack uses image `ghcr.io/newgithubguy/fi-cal-final:latest`.
2. Click **Pull and redeploy**.
3. If updates are still stale, verify Portainer has valid GHCR registry credentials and redeploy.
4. Hard refresh the browser.

Recent UI updates include keyboard calculator input, highlighted-day sidebar transactions, and compact side-by-side workspace panels below the calendar.

## Security Note

Change `SESSION_SECRET` in the stack to a long random value before production use.
