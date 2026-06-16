# Restore Engine phases

## RST-0.1 Standalone repo scaffold

- Create monorepo structure.
- Add API, worker, and web apps.
- Add shared package placeholders.
- Keep Nexus ERP untouched except later embed page.

## RST-0.2 Nexus auth bridge

- Verify Supabase JWT from Nexus.
- Resolve Nexus user, tenant, company, and role.
- Enforce company-admin vs platform-admin access.

## RST-0.3 Nexus admin embed

- Add a small route in `nexus-erp`.
- Embed Restore Center web UI.
- Pass secure session token.

## RST-1.1 Job database

- Add restore metadata schema.
- Add job CRUD endpoints.

## RST-1.2 Private file storage

- Signed upload URL.
- File metadata.
- Checksums.

## RST-1.3 Advanced upload UI

- Drag and drop.
- Progress.
- Retry/cancel.
- Large-file strategy.

## RST-2.x Detection and extraction

- Detector.
- CSV/XLSX/XML/IIF/JSON/NEXUSBAK parsers.
- Extraction progress.

## RST-3.x Normalize, map, validate

- Normalize models.
- Mapping UI.
- Validation engine.

## RST-4.x Restore plan and dry run

- Module selection.
- Conflict strategy.
- Risk score.

## RST-5.x Restore execution

- Nexus adapter.
- Master data.
- Transactions.
- Live logs.

## RST-6.x Reports and rollback

- Reports.
- Rollback preview.
- Rollback execution.

## RST-7.x Unsupported backup cases

- Support workflow.
- Platform dashboard.

## RST-8.x Competitor adapters

- Tally.
- QuickBooks.
- BUSY/Sage/Marg.
- Zoho/Xero/Odoo/ERPNext.

## RST-9.x AI assistant

- Mapping suggestions.
- Error explanations.
- Restore summary.
