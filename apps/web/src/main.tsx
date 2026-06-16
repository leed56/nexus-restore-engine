import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = import.meta.env.VITE_RESTORE_ENGINE_API_URL ?? 'http://localhost:8090'

type Job = {
  id: string
  status: string
  currentStep?: string
  progressPercent: number
  fileName?: string
  detectedFormat?: string
  sourceSystem?: string
  detectedModules: string[]
  summary: Record<string, unknown>
}

type Issue = { severity: 'warning' | 'error'; code: string; message: string }
type Plan = { riskLevel: string; totalActions: number; selectedModules: string[] }

function App() {
  const [job, setJob] = useState<Job | null>(null)
  const [sample, setSample] = useState('account_code,account_name,name,contact_type\n1200,Accounts Receivable,ABC Customer,customer\n2100,Accounts Payable,XYZ Supplier,supplier')
  const [issues, setIssues] = useState<Issue[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [log, setLog] = useState<string[]>([])

  async function api<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json() as Promise<T>
  }

  async function createJob() {
    const res = await api<{ job: Job }>('/v1/jobs', { sourceType: 'old_software_export', sourceSystem: 'generic', mode: 'dry_run' })
    setJob(res.job)
    setLog((items) => [`Created job ${res.job.id}`, ...items])
  }

  async function uploadMetadata() {
    if (!job) return
    const res = await api<{ job: Job }>(`/v1/jobs/${job.id}/upload-metadata`, { fileName: 'sample-import.csv', fileSize: sample.length, sample })
    setJob(res.job)
    setLog((items) => ['Uploaded metadata and detected file', ...items])
  }

  async function extract() {
    if (!job) return
    const res = await api<{ job: Job }>(`/v1/jobs/${job.id}/extract`, { text: sample })
    setJob(res.job)
    setLog((items) => ['Extraction completed', ...items])
  }

  async function validate() {
    if (!job) return
    const res = await api<{ job: Job; issues: Issue[] }>(`/v1/jobs/${job.id}/validate`, {})
    setJob(res.job)
    setIssues(res.issues)
    setLog((items) => [`Validation returned ${res.issues.length} issue(s)`, ...items])
  }

  async function buildPlan() {
    if (!job) return
    const res = await api<{ job: Job; plan: Plan }>(`/v1/jobs/${job.id}/plan`, { selectedModules: job.detectedModules, restoreMode: 'dry_run' })
    setJob(res.job)
    setPlan(res.plan)
    setLog((items) => ['Dry-run restore plan created', ...items])
  }

  async function dryRun() {
    if (!job) return
    const res = await api<{ job: Job; note: string }>(`/v1/jobs/${job.id}/execute`, {})
    setJob(res.job)
    setLog((items) => [res.note, 'Dry-run completed', ...items])
  }

  return <div className="shell">
    <header>
      <div>
        <div className="eyebrow">Standalone Engine</div>
        <h1>Nexus Restore Center</h1>
        <p>Upload, extract, validate, plan, dry-run, report, and later restore without disturbing the main Nexus ERP codebase.</p>
      </div>
      <button onClick={createJob}>New Restore Job</button>
    </header>

    <main className="grid">
      <section className="panel wide">
        <h2>1. Local file / sample upload</h2>
        <p className="muted">This scaffold uses a textarea as a stand-in for chunked upload. RST-1.3 replaces this with drag/drop + progress.</p>
        <textarea value={sample} onChange={(e) => setSample(e.target.value)} />
        <div className="actions">
          <button disabled={!job} onClick={uploadMetadata}>Upload metadata</button>
          <button disabled={!job} onClick={extract}>Start extract</button>
          <button disabled={!job} onClick={validate}>Validate</button>
          <button disabled={!job} onClick={buildPlan}>Build restore plan</button>
          <button disabled={!job || !plan} onClick={dryRun}>Dry-run</button>
        </div>
      </section>

      <section className="panel">
        <h2>Job status</h2>
        {job ? <>
          <div className="progress"><span style={{ width: `${job.progressPercent}%` }} /></div>
          <dl><dt>Job</dt><dd>{job.id}</dd><dt>Status</dt><dd>{job.status}</dd><dt>Step</dt><dd>{job.currentStep}</dd><dt>Format</dt><dd>{job.detectedFormat ?? 'not detected'}</dd><dt>Source</dt><dd>{job.sourceSystem ?? 'unknown'}</dd></dl>
        </> : <p className="muted">Create a job first.</p>}
      </section>

      <section className="panel"><h2>Detected modules</h2>{job?.detectedModules?.length ? <div className="chips">{job.detectedModules.map((m) => <span key={m}>{m}</span>)}</div> : <p className="muted">No modules yet.</p>}</section>
      <section className="panel"><h2>Validation</h2>{issues.length ? issues.map((i) => <div className={`issue ${i.severity}`} key={`${i.code}-${i.message}`}>{i.severity.toUpperCase()} {i.code}: {i.message}</div>) : <p className="muted">No validation issues yet.</p>}</section>
      <section className="panel"><h2>Restore plan</h2>{plan ? <dl><dt>Risk</dt><dd>{plan.riskLevel}</dd><dt>Actions</dt><dd>{plan.totalActions}</dd><dt>Modules</dt><dd>{plan.selectedModules.join(', ')}</dd></dl> : <p className="muted">No plan yet.</p>}</section>
      <section className="panel wide"><h2>Live logs</h2><pre>{log.join('\n') || 'No logs yet.'}</pre></section>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
