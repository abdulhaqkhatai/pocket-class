import React, { Suspense, lazy, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getCurrentUser } from './utils/auth'

const Login = lazy(() => import('./components/Login'))
const Signup = lazy(() => import('./components/Signup'))
const TeacherView = lazy(() => import('./components/TeacherView'))
const StudentView = lazy(() => import('./components/StudentView'))
const AnnualAverage = lazy(() => import('./components/AnnualAverage'))
const SubjectProgress = lazy(() => import('./components/SubjectProgress'))

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      Loading...
    </div>
  )
}

function RequireAuth({ children, role }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/signup" element={<Signup darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/teacher" element={
          <RequireAuth role="teacher">
            <TeacherView darkMode={darkMode} setDarkMode={setDarkMode} />
          </RequireAuth>
        } />
        <Route path="/student" element={
          <RequireAuth role="student">
            <StudentView darkMode={darkMode} setDarkMode={setDarkMode} />
          </RequireAuth>
        } />
        <Route path="/annual-average" element={
          <RequireAuth>
            <AnnualAverage darkMode={darkMode} setDarkMode={setDarkMode} />
          </RequireAuth>
        } />
        <Route path="/subject-progress" element={
          <RequireAuth>
            <SubjectProgress darkMode={darkMode} setDarkMode={setDarkMode} />
          </RequireAuth>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
