import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AccountsPage from '@/pages/AccountsPage'
import AccountDetailPage from '@/pages/AccountDetailPage'
import SubscriptionsPage from '@/pages/SubscriptionsPage'
import ContactsPage from '@/pages/ContactsPage'
import ActivityPage from '@/pages/ActivityPage'
import SalesPage from '@/pages/SalesPage'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { AuthContext } from '@/lib/authContext'

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setUserEmail(d.email); setAuthState('authenticated') })
      .catch(() => setAuthState('unauthenticated'))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUserEmail('')
    setAuthState('unauthenticated')
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-[var(--t4)] text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ email: userEmail, onLogout: handleLogout }}>
      <BrowserRouter>
        {authState === 'unauthenticated' ? (
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<LoginPage onLogin={email => { setUserEmail(email); setAuthState('authenticated') }} />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
