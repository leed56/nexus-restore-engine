# Nexus Restore Engine Architecture

## Separation principle

The restore engine is standalone. Nexus ERP should not parse or extract large or proprietary backups in the main app. Nexus exposes an admin page and secure token bridge only.

## Runtime components

```text
Nexus Admin Page
  -> Restore Engine Web UI
  -> Restore Engine API
  -> Restore Engine Worker
  -> Restore Engine metadata DB
  -> Private file storage
  -> Controlled Nexus adapter / future Nexus Import Gateway
```

## Three product flows

1. Nexus Backup & Restore
   - `.nexusbak` files created by Nexus.
   - Full restore and selected-module restore.

2. Old Software Migration Assistant
   - CSV, XLSX, XML, IIF, JSON exports from old accounting systems.
   - Guided mapping, validation, dry run, restore plan, and report.

3. Unsupported Backup Upload
   - Native proprietary backups become support cases.
   - Examples: QuickBooks `.qbb`, `.qbw`, database `.bak`, raw Tally/BUSY/Sage backups.

## Restore pipeline

```text
Create job
Upload file
Detect file type
Extract content
Normalize to Nexus model
Validate data
Build restore plan
Run dry run
Admin approves
Execute restore through controlled adapter
Generate report
Track records for rollback
```

## Safety rules

- Live writes into Nexus are disabled in the scaffold.
- Service-role keys stay only in the restore engine backend.
- Browser never imports directly into Nexus tables.
- Every restore must support dry run first.
- Every created or updated Nexus record must be tracked for rollback.
- AI can suggest mappings and explanations, but cannot commit data automatically.
