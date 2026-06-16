import Fastify from 'fastify'

type RestoreJob = {
  id: string
  status: string
  sourceType: 'nexus_backup' | 'old_software_export' | 'unsupported_backup'
  sourceSystem: string
  mode: string
  progressPercent: number
  currentStep: string
  fileName?: string
  fileSize?: number
  detectedFormat?: string
  detectedModules: string[]
  summary: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const jobs = new Map<string, RestoreJob>()
const samples = new Map<string, string>()
const issues = new Map<string, Array<{ severity: 'warning' | 'error'; code: string; message: string }>>()

function nowIso() { return new Date().toISOString() }
function createId(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}` }

function detectFile(fileName: string, sample = '') {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.nexusbak')) return { format: 'nexusbak', sourceSystem: 'nexus', supported: true }
  if (lower.endsWith('.csv')) return { format: 'csv', sourceSystem: guessSource(sample), supported: true }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return { format: 'xlsx', sourceSystem: guessSource(sample), supported: true }
  if (lower.endsWith('.xml')) return { format: 'xml', sourceSystem: sample.includes('<TALLYMESSAGE') ? 'tally' : 'generic', supported: true }
  if (lower.endsWith('.iif')) return { format: 'iif', sourceSystem: 'quickbooks', supported: true }
  if (lower.endsWith('.json')) return { format: 'json', sourceSystem: 'generic', supported: true }
  if (['.qbb', '.qbw', '.bak', '.rar', '.7z'].some((ext) => lower.endsWith(ext))) {
    return { format: lower.split('.').pop() ?? 'unknown', sourceSystem: 'unknown', supported: false, reason: 'Native or proprietary backup requires assisted conversion' }
  }
  return { format: 'unknown', sourceSystem: 'unknown', supported: false, reason: 'Unknown file type' }
}

function guessSource(sample: string) {
  const s = sample.toLowerCase()
  if (s.includes('tally') || s.includes('ledger') || s.includes('voucher')) return 'tally'
  if (s.includes('quickbooks') || s.includes('!accnt') || s.includes('!cust')) return 'quickbooks'
  if (s.includes('busy')) return 'busy'
  if (s.includes('sage')) return 'sage'
  if (s.includes('xero')) return 'xero'
  if (s.includes('zoho')) return 'zoho_books'
  return 'generic'
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; continue }
    if (ch === '"') { quoted = !quoted; continue }
    if (ch === ',' && !quoted) { out.push(current.trim()); current = ''; continue }
    current += ch
  }
  out.push(current.trim())
  return out
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const headers = splitCsvLine(lines[0] ?? '')
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), cells[i] ?? '']))
  })
}

function normalizeRows(rows: Record<string, string>[]) {
  const accounts = rows.filter((row) => row.account_code || row.account_name || row.ledger || row.ledger_name)
  const contacts = rows.filter((row) => row.name || row.contact_name || row.customer || row.supplier)
  const openingBalances = rows.filter((row) => row.debit || row.credit)
  return { accounts, contacts, openingBalances }
}

const app = Fastify({ logger: true })

app.get('/health', async () => ({ ok: true, service: 'nexus-restore-engine-api', version: '0.1.0' }))

app.post('/v1/jobs', async (req) => {
  const body = req.body as Partial<RestoreJob>
  const id = createId('job')
  const job: RestoreJob = {
    id,
    status: 'created',
    sourceType: body.sourceType ?? 'old_software_export',
    sourceSystem: body.sourceSystem ?? 'generic',
    mode: body.mode ?? 'dry_run',
    progressPercent: 0,
    currentStep: 'created',
    detectedModules: [],
    summary: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  jobs.set(id, job)
  return { job }
})

app.get('/v1/jobs', async () => ({ jobs: [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }))

app.get('/v1/jobs/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  return { job }
})

app.post('/v1/jobs/:id/upload-metadata', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  const body = req.body as { fileName: string; fileSize: number; sample?: string }
  const detection = detectFile(body.fileName, body.sample ?? '')
  const updated: RestoreJob = {
    ...job,
    fileName: body.fileName,
    fileSize: body.fileSize,
    detectedFormat: detection.format,
    sourceSystem: detection.sourceSystem,
    status: detection.supported ? 'uploaded' : 'support_required',
    currentStep: detection.supported ? 'uploaded' : 'support_required',
    progressPercent: detection.supported ? 20 : 100,
    summary: detection.supported ? job.summary : { reason: detection.reason },
    updatedAt: nowIso(),
  }
  jobs.set(id, updated)
  if (body.sample) samples.set(id, body.sample)
  return { job: updated, detection }
})

app.post('/v1/jobs/:id/extract', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  const body = req.body as { text?: string }
  const text = body.text ?? samples.get(id) ?? ''
  const rows = parseCsv(text)
  const normalized = normalizeRows(rows)
  const modules = [normalized.accounts.length ? 'accounts' : null, normalized.contacts.length ? 'contacts' : null, normalized.openingBalances.length ? 'opening_balances' : null].filter(Boolean) as string[]
  const updated: RestoreJob = {
    ...job,
    status: 'extracted',
    currentStep: 'extracted',
    progressPercent: 45,
    detectedModules: modules,
    summary: { rows: rows.length, normalizedCounts: { accounts: normalized.accounts.length, contacts: normalized.contacts.length, openingBalances: normalized.openingBalances.length } },
    updatedAt: nowIso(),
  }
  jobs.set(id, updated)
  samples.set(id, text)
  return { job: updated, summary: updated.summary }
})

app.post('/v1/jobs/:id/validate', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  const rows = parseCsv(samples.get(id) ?? '')
  const normalized = normalizeRows(rows)
  const foundIssues: Array<{ severity: 'warning' | 'error'; code: string; message: string }> = []
  for (const [index, row] of normalized.contacts.entries()) {
    if (!row.name && !row.contact_name && !row.customer && !row.supplier) foundIssues.push({ severity: 'error', code: 'CONTACT_NAME_REQUIRED', message: `Contact row ${index + 1} is missing name` })
  }
  issues.set(id, foundIssues)
  const hasErrors = foundIssues.some((issue) => issue.severity === 'error')
  const updated: RestoreJob = { ...job, status: hasErrors ? 'mapping_required' : 'validated', currentStep: hasErrors ? 'needs_fixes' : 'validated', progressPercent: hasErrors ? 55 : 65, summary: { ...job.summary, validation: { errors: foundIssues.filter((i) => i.severity === 'error').length, warnings: foundIssues.filter((i) => i.severity === 'warning').length } }, updatedAt: nowIso() }
  jobs.set(id, updated)
  return { job: updated, issues: foundIssues }
})

app.post('/v1/jobs/:id/plan', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  const rows = parseCsv(samples.get(id) ?? '')
  const normalized = normalizeRows(rows)
  const selectedModules = job.detectedModules
  const totalActions = selectedModules.includes('accounts') ? normalized.accounts.length : 0
  const contactActions = selectedModules.includes('contacts') ? normalized.contacts.length : 0
  const openingActions = selectedModules.includes('opening_balances') ? normalized.openingBalances.length : 0
  const plan = { id: `plan_${id}`, jobId: id, restoreMode: 'dry_run', selectedModules, conflictStrategy: 'skip_duplicates', totalActions: totalActions + contactActions + openingActions, riskLevel: (issues.get(id) ?? []).some((i) => i.severity === 'error') ? 'high' : 'low' }
  const updated: RestoreJob = { ...job, status: 'dry_run_ready', currentStep: 'restore_plan_ready', progressPercent: 75, updatedAt: nowIso() }
  jobs.set(id, updated)
  return { job: updated, plan }
})

app.post('/v1/jobs/:id/execute', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  const updated: RestoreJob = { ...job, status: 'completed', currentStep: 'dry_run_completed', progressPercent: 100, summary: { ...job.summary, execution: { dryRunOnly: true, note: 'Live Nexus writes are disabled in scaffold.' } }, updatedAt: nowIso() }
  jobs.set(id, updated)
  return { job: updated, result: updated.summary.execution, note: 'Scaffold runs dry-run only. Live Nexus writes are disabled.' }
})

app.get('/v1/jobs/:id/report.md', async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = jobs.get(id)
  if (!job) return reply.code(404).send({ error: 'Job not found' })
  reply.type('text/markdown')
  return [`# Restore Report`, ``, `Job: ${job.id}`, `Status: ${job.status}`, `Source: ${job.sourceType} / ${job.sourceSystem}`, `Modules: ${job.detectedModules.join(', ') || 'none'}`].join('\n')
})

const port = Number(process.env.PORT ?? 8090)
await app.listen({ port, host: '0.0.0.0' })
