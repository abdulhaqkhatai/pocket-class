import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../utils/auth'

export default function Login({ darkMode, setDarkMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Signing in...')
  const loadingTimerRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    }
  }, [])

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setLoadingMessage('Signing in...')

    loadingTimerRef.current = setTimeout(() => {
      setLoadingMessage('Server is waking up, please wait... (first visit may take 30–60 seconds)')
    }, 3000)

    const res = await login(username.trim(), password)

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)

    if (res.success) {
      nav(res.user.role === 'teacher' ? '/teacher' : '/student')
    } else {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle" title={darkMode ? 'Light Mode' : 'Dark Mode'}>
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="login-card card" style={{ textAlign: 'center', maxWidth: '450px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'var(--accent)',
          borderRadius: '16px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white',
          boxShadow: '0 8px 16px var(--accent-soft)'
        }}>
          📚
        </div>

        <h1 className="header" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          <span style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>PocketClass</span>
        </h1>
        <p className="hint" style={{ marginBottom: '32px', fontSize: '1rem' }}>Teacher & Student portal</p>

        <form onSubmit={handleSignIn} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label>Username</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" disabled={loading} autoComplete="username" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" disabled={loading} autoComplete="current-password" />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '14px' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span className="spinner"></span> {loadingMessage}
              </span>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>

        <p className="hint" style={{ marginTop: '24px', fontSize: '0.9rem' }}>
          Are you a teacher?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up here
          </Link>
        </p>
      </div>

      <style>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
