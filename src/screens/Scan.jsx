import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { scanReceipt, fileToBase64 } from '../services/gemini'

const TABS = ['Camera', 'Image', 'PDF']

export default function Scan() {
  const { currentMember, geminiKey, startNewReceipt, setReceiptItems, updateReceiptMeta, showToast } = useApp()
  const navigate = useNavigate()

  const [tab,       setTab]       = useState(0)
  const [scanning,  setScanning]  = useState(false)
  const [camActive, setCamActive] = useState(false)
  const [error,     setError]     = useState('')

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef   = useRef(null)
  const pdfRef    = useRef(null)

  // ── Camera ──────────────────────────────────────────────────────────────
  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamActive(true)
    } catch (e) {
      setError('Camera access denied. Please allow camera access and try again.')
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
    await processImage(base64, 'image/jpeg')
  }

  // ── File upload ──────────────────────────────────────────────────────────
  async function handleImageFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64   = await fileToBase64(file)
    const mimeType = file.type || 'image/jpeg'
    await processImage(base64, mimeType)
    e.target.value = ''
  }

  async function handlePDFFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await fileToBase64(file)
    await processImage(base64, 'application/pdf')
    e.target.value = ''
  }

  // ── AI processing ────────────────────────────────────────────────────────
  async function processImage(base64, mimeType) {
    setScanning(true)
    setError('')
    try {
      const data = await scanReceipt(geminiKey, base64, mimeType)
      startNewReceipt(currentMember.name)
      updateReceiptMeta({ store: data.store, date: data.date, receiptNumber: data.receiptNumber })
      setReceiptItems(data.items)
      navigate('/tag')
    } catch (e) {
      setError(e.message || 'Scanning failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  // ── Manual entry ──────────────────────────────────────────────────────────
  function goManual() {
    startNewReceipt(currentMember.name)
    setReceiptItems([])
    navigate('/tag')
  }

  return (
    <div className="screen fade-in">
      <Header title="Scan Receipt" showBack />

      <div className="scroll-area">
        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => { setTab(i); stopCamera(); setError('') }}
              style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {scanning && (
          <div style={styles.scanningOverlay}>
            <div className="spinner" />
            <p style={{ marginTop: 16, fontWeight: 600, color: 'var(--text)' }}>Reading receipt…</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Gemini AI is extracting your items</p>
          </div>
        )}

        {/* Camera tab */}
        {tab === 0 && !scanning && (
          <div style={styles.tabContent}>
            {!camActive ? (
              <div style={styles.placeholder}>
                <p style={styles.placeholderIcon}>📷</p>
                <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Point at your receipt</p>
                <p style={{ marginBottom: 20 }}>Works best in good lighting. Keep the receipt flat and in frame.</p>
                <button className="btn btn-primary btn-full" onClick={startCamera}>
                  Start Camera
                </button>
              </div>
            ) : (
              <div style={styles.camWrap}>
                <video ref={videoRef} style={styles.video} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={styles.camOverlay}>
                  <div style={styles.camFrame} />
                </div>
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageFile}
              style={{ display: 'none' }}
            />
            <div style={styles.placeholder}>
              <p style={styles.placeholderIcon}>🖼️</p>
              <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Upload a receipt photo</p>
              <p style={{ marginBottom: 20 }}>Screenshots, photos, or scanned images. JPG, PNG, WEBP supported.</p>
              <button className="btn btn-primary btn-full" onClick={() => fileRef.current?.click()}>
                Choose Image
              </button>
            </div>
          </div>
        )}

        {/* PDF tab */}
        {tab === 2 && !scanning && (
          <div style={styles.tabContent}>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              onChange={handlePDFFile}
              style={{ display: 'none' }}
            />
            <div style={styles.placeholder}>
              <p style={styles.placeholderIcon}>📄</p>
              <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Upload a PDF invoice</p>
              <p style={{ marginBottom: 20 }}>E-receipts, invoices, and digital documents in PDF format.</p>
              <button className="btn btn-primary btn-full" onClick={() => pdfRef.current?.click()}>
                Choose PDF
              </button>
            </div>
          </div>
        )}

        {/* Manual entry */}
        {!scanning && (
          <div style={styles.manual}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>
              No receipt? Paid cash? No problem.
            </p>
            <button className="btn btn-secondary btn-full" onClick={goManual}>
              ✏️ Enter items manually
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  tabs: {
    display: 'flex',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-3)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--green-dark)',
    color: '#fff',
  },
  tabContent: {
    marginBottom: 16,
  },
  placeholder: {
    background: 'var(--surface)',
    border: '2px dashed var(--border-mid)',
    borderRadius: 'var(--radius-md)',
    padding: '32px 20px',
    textAlign: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
    lineHeight: 1,
  },
  camWrap: {
    position: 'relative',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: '#000',
    aspectRatio: '3/4',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  camOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camFrame: {
    width: '80%',
    height: '55%',
    border: '2px solid rgba(255,255,255,0.6)',
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
  },
  camControls: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    background: '#fff',
    border: '3px solid rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: '#fff',
    border: '2px solid rgba(0,0,0,0.15)',
  },
  camCancel: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
  },
  scanningOverlay: {
    textAlign: 'center',
    padding: '48px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    background: 'var(--red-pale)',
    color: 'var(--red)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: 14,
    marginBottom: 12,
  },
  manual: {
    textAlign: 'center',
    paddingTop: 8,
  },
}
