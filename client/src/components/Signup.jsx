import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../utils/auth'

export default function Signup({ darkMode, setDarkMode }) {
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const nav = useNavigate()

    async function handleSignup(e) {
        e.preventDefault()
        setError('')
        if (!username.trim() || !password) return setError('Username and password are required')
        if (password.length < 6) return setError('Password must be at least 6 characters')
        if (password !== confirm) return setError('Passwords do not match')

        setLoading(true)
        const res = await signup(name.trim() || username.trim(), username.trim(), password)
        setLoading(false)

        if (res.success) {
            nav('/teacher')
        } else {
            setError(res.error || 'Signup failed. Username may already be taken.')
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

                <h1 className="header" style={{ justifyContent: 'center', marginBottom: '4px' }}>
                    <span style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>PocketClass</span>
                </h1>
                <p className="hint" style={{ marginBottom: '28px', fontSize: '1rem' }}>Create your teacher account</p>

                <form onSubmit={handleSignup} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label>Display Name <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                        <input
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your full name"
                            disabled={loading}
                            autoComplete="name"
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>Username <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(students will use this to find you)</span></label>
                        <input
                            className="input"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>Password</label>
                        <input
                            className="input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label>Confirm Password</label>
                        <input
                            className="input"
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Repeat password"
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '14px' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <span className="spinner"></span> Creating account...
                            </span>
                        ) : 'Create Teacher Account'}
                    </button>
                </form>

                <p className="hint" style={{ marginTop: '24px', fontSize: '0.9rem' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Sign In
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
