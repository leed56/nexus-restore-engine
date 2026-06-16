# Minimal Nexus ERP integration

Do not move parser or extractor code into Nexus ERP.

Add only these files to `leed56/nexus-erp` when ready:

```text
src/pages/platform/PlatformRestoreCenterPage.tsx
src/pages/settings/RestoreCenterPage.tsx
src/components/restore/RestoreCenterEmbed.tsx
src/lib/restoreEngineClient.ts
```

## Env vars in Nexus

```text
VITE_RESTORE_ENGINE_WEB_URL=https://restore.nexuserp.com
VITE_RESTORE_ENGINE_API_URL=https://restore-api.nexuserp.com
```

## Embed approach

1. Nexus admin opens `/platform/restore-center`.
2. Nexus verifies role locally.
3. Nexus obtains current access token.
4. Nexus embeds Restore Center UI.
5. Restore Center verifies token with Nexus/Supabase and scopes user.

## Placeholder embed component

```tsx
export default function RestoreCenterEmbed() {
  const url = import.meta.env.VITE_RESTORE_ENGINE_WEB_URL
  return <iframe src={url} style={{ width: '100%', height: 'calc(100vh - 80px)', border: 0 }} />
}
```

## Main rule

Nexus ERP remains the ERP app. This repo owns upload, extraction, validation, dry run, restore planning, reports, and rollback tracking.
