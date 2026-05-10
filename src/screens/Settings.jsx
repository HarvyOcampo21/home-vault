import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { showToast, setCurrentMember } = useApp()
  const navigate = useNavigate()

  const [gemini, setGemini] = useState(localStorage.getItem('geminiApiKey') || '')
  const [sheets, setSheets] = useState(localStorage.getItem('sheetsScriptUrl') || '')
  const [showGemini, setShowGemini] = useState(false)
  const [showSheets, setShowSheets] = useState(false)

  function save() {
    localStorage.setItem('geminiApiKey', gemini.trim())
    localStorage.setItem('sheetsScriptUrl', sheets.trim())
    showToast('✅ Settings saved')
    navigate('/')
  }

  function clearAll() {
    if (!confirm('Clear all settings and switch user?')) return
    localStorage.clear()
    setCurrentMember(null)
    navigate('/select')
  }

  return (
    <div className="screen fade-in">
      <Header title="Settings" showBack />

      <div className="scroll-area">

        {/* Gemini API */}
        <p className="section-label">Gemini AI (receipt scanning)</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={styles.hint}>
            Get your free API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={styles.link}>
              Google AI Studio →
            </a>
          </p>
          <div style={{ position: 'relative' }}>
            <input
              type={showGemini ? 'text' : 'password'}
              placeholder="AIza..."
              value={gemini}
              onChange={e => setGemini(e.target.value)}
              style={{ paddingRight: 52 }}
            />
            <button onClick={() => setShowGemini(s => !s)} style={styles.eyeBtn}>
              {showGemini ? '🙈' : '👁'}
            </button>
          </div>
          {gemini && (
            <p style={{ fontSize: 12, color: 'var(--green-dark)', marginTop: 6 }}>✓ Key entered</p>
          )}
        </div>

        {/* Google Sheets */}
        <p className="section-label">Google Sheets (data storage)</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={styles.hint}>
            Deploy your Google Apps Script and paste the web app URL here.{' '}
            <span style={{ color: 'var(--text-3)' }}>See SETUP_GUIDE.md for step-by-step instructions.</span>
          </p>
          <div style={{ position: 'relative' }}>
            <input
              type={showSheets ? 'text' : 'password'}
              placeholder="https://script.google.com/macros/s/..."
              value={sheets}
              onChange={e => setSheets(e.target.value)}
              style={{ paddingRight: 52 }}
            />
            <button onClick={() => setShowSheets(s => !s)} style={styles.eyeBtn}>
              {showSheets ? '🙈' : '👁'}
            </button>
          </div>
          {sheets && (
            <p style={{ fontSize: 12, color: 'var(--green-dark)', marginTop: 6 }}>✓ URL entered</p>
          )}
        </div>

        {/* Status */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Status</p>
          <StatusRow label="Gemini AI"      ok={Boolean(gemini)} />
          <StatusRow label="Google Sheets"  ok={Boolean(sheets)} />
          <StatusRow label="Members"        ok sub="10 members configured" />
          <StatusRow label="Currency"       ok sub="AED" />
        </div>

        <button className="btn btn-primary btn-full" onClick={save} style={{ marginBottom: 10 }}>
          Save Settings
        </button>

        <button className="btn btn-secondary btn-full" onClick={() => navigate('/select')}>
          Switch member
        </button>

        <button className="btn btn-danger btn-full" onClick={clearAll} style={{ marginTop: 8 }}>
          Clear all data & reset
        </button>

        <div style={{ height: 24 }} />

        {/* Setup guide shortcut */}
        <div className="card" style={{ background: 'var(--blue-pale)', borderColor: 'var(--blue)', marginBottom: 16 }}>
          <p style={{ fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>📋 First time setup?</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Check the <strong>SETUP_GUIDE.md</strong> file included in the project. It walks you through getting your Gemini key and setting up the Google Sheet in about 10 minutes.
          </p>
        </div>

      </div>
    </div>
  )
}

function StatusRow({ label, ok, sub }) {
  return (
    <div style={styles.statusRow}>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--green-dark)' : 'var(--red)' }}>
          {ok ? '✓ Ready' : '✗ Not set'}
        </span>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </div>
  )
}

const styles = {
  hint: { fontSize: 13, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 },
  link: { color: 'var(--green-dark)', fontWeight: 600 },
  eyeBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' },
}
