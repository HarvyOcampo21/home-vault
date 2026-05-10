import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export const MEMBERS = [
  { name: 'Angella',  initials: 'AN' },
  { name: 'Ben',      initials: 'BE' },
  { name: 'Alvin',    initials: 'AL' },
  { name: 'Sachika',  initials: 'SA' },
  { name: 'Harvy',    initials: 'HA' },
  { name: 'Ruby',     initials: 'RU' },
  { name: 'Jobel',    initials: 'JO' },
  { name: 'Chu',      initials: 'CH' },
  { name: 'Eva',      initials: 'EV' },
  { name: 'Ananias',  initials: 'AE' },
]

const EMPTY_RECEIPT = {
  store: '',
  date: new Date().toISOString().split('T')[0],
  receiptNumber: '',
  scannedBy: '',
  items: [],
}

export function AppProvider({ children }) {
  const [currentMember, setCurrentMember] = useState(() => {
    const saved = localStorage.getItem('currentMember')
    return saved ? JSON.parse(saved) : null
  })

  const [pendingReceipt, setPendingReceipt] = useState(EMPTY_RECEIPT)
  const [toast, setToast] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    if (currentMember) {
      localStorage.setItem('currentMember', JSON.stringify(currentMember))
    }
  }, [currentMember])

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  function showToast(msg, duration = 2500) {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }

  function startNewReceipt(memberName) {
    setPendingReceipt({
      ...EMPTY_RECEIPT,
      scannedBy: memberName,
      date: new Date().toISOString().split('T')[0],
    })
  }

  function updateReceiptMeta(fields) {
    setPendingReceipt(r => ({ ...r, ...fields }))
  }

  function setReceiptItems(items) {
    setPendingReceipt(r => ({ ...r, items }))
  }

  function addItem(item) {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      totalPrice: 0,
      category: 'house',
      forMember: '',
      status: 'paid',
      ...item,
    }
    setPendingReceipt(r => ({ ...r, items: [...r.items, newItem] }))
    return newItem.id
  }

  function updateItem(id, fields) {
    setPendingReceipt(r => ({
      ...r,
      items: r.items.map(item => item.id === id ? { ...item, ...fields } : item)
    }))
  }

  function removeItem(id) {
    setPendingReceipt(r => ({ ...r, items: r.items.filter(item => item.id !== id) }))
  }

  function clearReceipt() {
    setPendingReceipt({ ...EMPTY_RECEIPT, scannedBy: currentMember?.name || '' })
  }

  const geminiKey    = import.meta.env.VITE_GEMINI_API_KEY || ''
  const sheetsUrl    = import.meta.env.VITE_SHEETS_SCRIPT_URL || ''
  const isConfigured = Boolean(geminiKey && sheetsUrl)

  return (
    <AppContext.Provider value={{
      currentMember, setCurrentMember,
      members: MEMBERS,
      pendingReceipt,
      startNewReceipt, updateReceiptMeta, setReceiptItems,
      addItem, updateItem, removeItem, clearReceipt,
      showToast, toast,
      isOnline,
      isConfigured,
      geminiKey,
      sheetsUrl,
    }}>
      {children}
      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
