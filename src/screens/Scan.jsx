import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { scanReceipt, fileToBase64 } from '../services/gemini'

const TABS = ['Camera', 'Image', 'PDF']

export default function Scan() {
  const { currentMember, geminiKey, startNewReceipt, setReceiptItems, updateReceiptMeta, showToast } = useApp()
  const navigate = useNavigate()

  const [tab,        setTab]        = useState(0)
  const [scanning,   setScanning]   = useState(false)
  const [camActive,  setCamActive]  = useState(false)
  const [error,      setError]      = useState('')
  const [progress,   setProgress]   = useState({ current: 0, total: 0, label: '' })

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef   = useRef(null)
  const pdfRef    = useRef(null)

  // ── Camera ──────────────────────────────────────────────────
  async function startCamera() {
    setError('')
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try { await videoRef.current.play() } catch {}
      }
      setCamActive(true)
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        setError('Camera access denied. In Safari: go to Settings → Safari → Camera → Allow.')
      } else {
        setError('Could not start camera. Use the Image tab to upload a photo instead.')
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamActive(false)
  }

  async function capturePhoto() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
    stopCamera()
    await processFiles([{ base64, mimeType: 'image/jpeg', label: 'Photo' }])
  }

  // ── Multiple image upload ────────────────────────────────────
  async function handleImageFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const items = await Promise.all(files.map(async (f, i) => ({
      base64: await fileToBase64(f),
      mimeType: f.type || 'image/jpeg',
      label: files.length > 1 ? `Image ${i + 1} of ${files.length}` : 'Image',
    })))
    await processFiles(items)
    e.target.value = ''
  }

  // ── Multiple PDF upload ─────────────────────────────────────
  async function handlePDFFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const items = await Promise.all(files.map(async (f, i) => ({
      base64: await fileToBase64(f),
      mimeType: 'application/pdf',
      label: files.length > 1 ? `PDF ${i + 1} of ${files.length}` : f.name,
    })))
    await processFiles(items)
    e.target.value = ''
  }

  // ── Process one or more files, merge all items ───────────────
  async function processFiles(files) {
    setScanning(true)
    setError('')

    let mergedItems = []
    let firstMeta   = null

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setProgress({ current: i + 1, total: files.length, label: f.label })

      try {
        const data = await scanReceipt(geminiKey, f.base64, f.mimeType)
        if (!firstMeta) {
          firstMeta = { store: data.store, date: data.date, receiptNumber: data.receiptNumber }
        }
        // Tag each item with which page/file it came from (if multiple)
        mergedItems = [...mergedItems, ...data.items]
      } catch (e) {
        setError(`Failed on ${f.label}: ${e.message}`)
        setScanning(false)
        setProgress({ current: 0, total: 0, label: '' })
        return
      }
    }

    startNewReceipt(currentMember.name)
    updateReceiptMeta(firstMeta || {})
    setReceiptItems(mergedItems)
    setScanning(false)
    setProgress({ current: 0, total: 0, label: '' })
    navigate('/tag')
  }

  function goManual() {
    startNewReceipt(currentMember.name)
    setReceiptItems([])
    navigate('/tag')
  }

  const scanPct = progress.total > 1 ? Math.round((progress.current / progress.total) * 100) : null

  return (
    <div className="screen fade-in">
      <Header title="Scan Receipt" showBack />

      <div className="scroll-area">
        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => { setTab(i); stopCamera(); setError('') }}
              style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}>
              {t}
            </button>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Scanning overlay */}
        {scanning && (
          <div style={styles.scanningBox}>
            <div className="spinner" />
            <p style={{ marginTop: 16, fontWeight: 600, color: 'var(--text)' }}>
              {progress.total > 1 ? `Scanning ${progress.label}…` : 'Reading receipt…'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Gemini AI is extracting your items</p>
            {scanPct !== null && (
              <div style={styles.progressWrap}>
                <div style={{ ...styles.progressBar, width: `${scanPct}%` }} />
              </div>
            )}
            {progress.total > 1 && (
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                {progress.current} of {progress.total} images
              </p>
            )}
          </div>
        )}

        {/* Camera tab */}
        {tab === 0 && !scanning && (
          <div style={styles.tabContent}>
            {!camActive ? (
              <Placeholder icon="📷" title="Point at your receipt" sub="Works best in good lighting. Keep the receipt flat and in frame.">
                <button className="btn btn-primary btn-full" onClick={startCamera}>Start Camera</button>
              </Placeholder>
            ) : (
              <div style={styles.camWrap}>
                <video ref={videoRef} style={styles.video} autoPlay playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={styles.camOverlay}><div style={styles.camFrame} /></div>
                <div style={styles.camControls}>
                  <button onClick={stopCamera} style={styles.camCancel}>✕</button>
                  <button onClick={capturePhoto} style={styles.shutter} aria-label="Capture">
                    <div style={styles.shutterInner} />
                  </button>
                  <div style={{ width: 44 }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image tab */}
        {tab === 1 && !scanning && (
          <div style={styles.tabContent}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageFiles} style={{ display: 'none' }} />
            <Placeholder icon="🖼️" title="Upload receipt photos" sub="Select one image or multiple for long receipts. JPG, PNG, WEBP supported.">
              <button className="btn btn-primary btn-full" onClick={() => fileRef.current?.click()}>
                Choose Image(s)
              </button>
              <p style={styles.multiHint}>💡 Tip: select multiple photos at once for long receipts</p>
            </Placeholder>
          </div>
        )}

        {/* PDF tab */}
        {tab === 2 && !scanning && (
          <div style={styles.tabContent}>
            <input ref={pdfRef} type="file" accept="application/pdf" multiple onChange={handlePDFFiles} style={{ display: 'none' }} />
            <Placeholder icon="📄" title="Upload PDF invoices" sub="Select one or multiple PDF files — all items will be merged into one receipt.">
              <button className="btn btn-primary btn-full" onClick={() => pdfRef.current?.click()}>
                Choose PDF(s)
              </button>
              <p style={styles.multiHint}>💡 Tip: select multiple PDFs to combine into one receipt</p>
            </Placeholder>
          </div>
        )}

        {!scanning && (
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>No receipt? Paid cash? No problem.</p>
            <button className="btn btn-secondary btn-full" onClick={goManual}>✏️ Enter items manually</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Placeholder({ icon, title, sub, children }) {
  return (
    <div style={styles.placeholder}>
      <p style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>{icon}</p>
      <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{title}</p>
      <p style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-2)' }}>{sub}</p>
      {children}
    </div>
  )
}

const styles = {
  tabs: { display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { background: 'var(--green-dark)', color: '#fff' },
  tabContent: { marginBottom: 16 },
  placeholder: { background: 'var(--surface)', border: '2px dashed var(--border-mid)', borderRadius: 'var(--radius-md)', padding: '28px 20px', textAlign: 'center' },
  multiHint: { fontSize: 12, color: 'var(--text-3)', marginTop: 10 },
  camWrap: { position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', aspectRatio: '3/4' },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  camOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  camFrame: { width: '80%', height: '55%', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' },
  camControls: { position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 },
  shutter: { width: 68, height: 68, borderRadius: '50%', background: '#fff', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  shutterInner: { width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '2px solid rgba(0,0,0,0.15)' },
  camCancel: { width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer' },
  scanningBox: { textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  error: { background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 14, marginBottom: 12 },
  progressWrap: { width: '100%', maxWidth: 240, height: 6, background: 'var(--border-mid)', borderRadius: 99, overflow: 'hidden', marginTop: 12 },
  progressBar: { height: '100%', background: 'var(--green-dark)', borderRadius: 99, transition: 'width 0.3s ease' },
}
