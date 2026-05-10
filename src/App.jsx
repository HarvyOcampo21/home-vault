import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'

import MemberSelect from './screens/MemberSelect'
import Dashboard    from './screens/Dashboard'
import Scan         from './screens/Scan'
import TagItems     from './screens/TagItems'
import History      from './screens/History'
import SettleUp     from './screens/SettleUp'
import MonthEnd     from './screens/MonthEnd'
import Settings     from './screens/Settings'

function AppRoutes() {
  const { currentMember } = useApp()

  if (!currentMember) {
    return (
      <Routes>
        <Route path="/select" element={<MemberSelect />} />
        <Route path="*"       element={<Navigate to="/select" replace />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/scan"    element={<Scan />} />
        <Route path="/tag"     element={<TagItems />} />
        <Route path="/history" element={<History />} />
        <Route path="/settle"  element={<SettleUp />} />
        <Route path="/month"   element={<MonthEnd />} />
        <Route path="/settings"element={<Settings />} />
        <Route path="/select"  element={<MemberSelect />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
