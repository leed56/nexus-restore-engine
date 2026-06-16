# Nexus Restore Engine

Standalone backup, restore, and migration engine for Nexus ERP.

This repository is intentionally separated from the main `nexus-erp` application. The main Nexus app should only embed or call this engine from an admin page. Heavy backup extraction, validation, restore planning, and restore execution should run here.

## Product areas

1. **Nexus Backup & Restore**
   - Full restore for `.nexusbak` files created by Nexus.
   - Restore into a new company first, then support safe merge/update modes.

2. **Old Software Migration Assistant**
   - Guided import from Tally, QuickBooks, BUSY, Sage, Zoho Books, Xero, Odoo, ERPNext, Marg ERP, and generic CSV/XLSX/XML/IIF files.
   - Mapping, validation, preview, dry run, import report, and rollback.

3. **Unsupported Backup Upload**
   - Secure support-case workflow for proprietary backup files like `.qbb`, `.qbw`, `.bak`, raw Tally/BUSY/Sage backups, `.zip`, `.rar`, and `.7z`.

## Monorepo layout

```txt
apps/
  api/       Restore Engine API
  worker/    Background extraction/restore worker
  web/       Standalone admin UI that can be embedded inside Nexus
packages/
  types/
  parsers/
  adapters/
  validators/
  restore-planner/
  nexus-client/
  security/
  reporting/
infra/
  migrations/
  docker/
docs/
```

## Current status

This is the Phase 0/1 scaffold:

- API app placeholder
- Worker app placeholder
- Web admin UI placeholder
- Shared packages
- Restore-engine database schema
- Dry-run-only Nexus client
- Documentation for architecture, phases, and Nexus integration

Live writes to Nexus are disabled by default. Restore execution must use dry run until the Nexus Import Gateway or controlled restore adapter is implemented and reviewed.

## Quick start

```bash
npm install
npm run dev
```

API health:

```bash
curl http://localhost:8787/health
```

## Safety rules

- Do not parse heavy backup files inside the main Nexus ERP app.
- Do not expose service-role keys to the browser.
- Upload files to private storage only.
- Extract into staging tables first.
- Validate and dry-run before restore.
- Admin must explicitly approve restore execution.
- Track every created/updated record for rollback.
- AI may suggest mappings/fixes but must never commit data automatically.
