import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { weeklyAndMonthlyStats, calculateConsistency } from '../utils/stats'
import { logout, getCurrentUser } from '../utils/auth'
import { apiFetch } from '../utils/api'

export default function TeacherView({ darkMode, setDarkMode }) {
  const navigate = useNavigate()

  // ── Data state ──────────────────────────────────────────────
  const [tests, setTests] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Add marks form ──────────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [weekNum, setWeekNum] = useState('1')
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [marks, setMarks] = useState({ obtained: '', total: '' })
  const [addTestError, setAddTestError] = useState('')

  // ── Subject management ──────────────────────────────────────
  const [newSubjectName, setNewSubjectName] = useState('')
  const [subjectError, setSubjectError] = useState('')
  const [subjectLoading, setSubjectLoading] = useState(false)

  // ── Student management ──────────────────────────────────────
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [studentForm, setStudentForm] = useState({ name: '', username: '', password: '', subjects: [] })
  const [studentFormError, setStudentFormError] = useState('')
  const [studentFormLoading, setStudentFormLoading] = useState(false)

  // ── UI ───────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [editingRows, setEditingRows] = useState({})
  const [showConsistencyInfo, setShowConsistencyInfo] = useState(false)
  const [viewingStudentId, setViewingStudentId] = useState('all')

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    Promise.all([
      apiFetch('/api/subjects'),
      apiFetch('/api/students'),
      apiFetch('/api/tests'),
    ]).then(([subs, studs, tsts]) => {
      if (!mounted) return
      if (Array.isArray(subs)) setSubjects(subs)
      if (Array.isArray(studs)) setStudents(studs)
      if (Array.isArray(tsts)) setTests(tsts.map(t => ({ ...t, id: t._id })))
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  // Set defaults for add-marks form
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectKey) setSelectedSubjectKey(subjects[0].name)
  }, [subjects])
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) setSelectedStudentId(students[0]._id)
  }, [students])

  // ── Filtered tests (by student picker) ──────────────────────
  const displayTests = React.useMemo(() => {
    if (viewingStudentId === 'all') return tests
    return tests.filter(t => String(t.studentId) === viewingStudentId)
  }, [tests, viewingStudentId])

  // ── Months for nav ───────────────────────────────────────────
  const months = React.useMemo(() => {
    const set = new Set()
    displayTests.forEach(t => {
      const d = new Date(t.date)
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [displayTests])

  useEffect(() => {
    if (months.length && !selectedMonth) setSelectedMonth(months[0])
    if (months.length && selectedMonth && !months.includes(selectedMonth)) setSelectedMonth(months[0])
  }, [months])

  const filteredTests = React.useMemo(() => {
    if (!selectedMonth) return []
    return displayTests.filter(t => {
      const d = new Date(t.date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth
    })
  }, [displayTests, selectedMonth])

  const stats = weeklyAndMonthlyStats(filteredTests)
  const allTimeStats = React.useMemo(() => weeklyAndMonthlyStats(displayTests), [displayTests])

  useEffect(() => {
    if (allTimeStats.annual?.length > 0 && !selectedYear) setSelectedYear(allTimeStats.annual[0].year)
  }, [allTimeStats])

  // ── Helpers ──────────────────────────────────────────────────
  function toReadable(mKey) {
    try { return new Date(mKey + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
    catch { return mKey }
  }

  function doLogout() {
    logout()
    window.location.href = '/login'
  }

  function studentName(id) {
    const s = students.find(s => String(s._id) === String(id))
    return s ? (s.name || s.username) : 'Unknown'
  }

  // ── Add marks ────────────────────────────────────────────────
  async function addTest() {
    setAddTestError('')
    if (!selectedStudentId) return setAddTestError('Please select a student')
    if (!selectedSubjectKey) return setAddTestError('Please add a subject first')
    const obtained = Number(marks.obtained)
    const total = Number(marks.total)
    if (isNaN(obtained) || isNaN(total) || total <= 0) return setAddTestError('Enter valid marks and total > 0')

    const payload = {
      date: new Date(date).toISOString(),
      marks: { [selectedSubjectKey]: { obtained, total } },
      week: Number(weekNum),
      studentId: selectedStudentId,
    }
    try {
      const created = await apiFetch('/api/tests', { method: 'POST', body: JSON.stringify(payload) })
      if (created.error) return setAddTestError(created.error)
      setTests(prev => [{ ...created, id: created._id }, ...prev])
      setMarks({ obtained: '', total: '' })
    } catch (err) {
      setAddTestError('Failed to add test')
    }
  }

  async function removeTest(id) {
    try {
      await apiFetch(`/api/tests/${id}`, { method: 'DELETE' })
      setTests(prev => prev.filter(t => t.id !== id))
    } catch { alert('Failed to delete') }
  }

  // ── Subject management ───────────────────────────────────────
  async function addSubject(e) {
    e.preventDefault()
    setSubjectError('')
    if (!newSubjectName.trim()) return setSubjectError('Enter a subject name')
    setSubjectLoading(true)
    try {
      const res = await apiFetch('/api/subjects', { method: 'POST', body: JSON.stringify({ name: newSubjectName.trim() }) })
      if (res.error) { setSubjectError(res.error); setSubjectLoading(false); return }
      setSubjects(prev => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSubjectName('')
      if (!selectedSubjectKey) setSelectedSubjectKey(res.name)
    } catch { setSubjectError('Failed to add subject') }
    setSubjectLoading(false)
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject? Tests using it will still exist.')) return
    try {
      await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' })
      setSubjects(prev => prev.filter(s => s._id !== id))
    } catch { alert('Failed to delete subject') }
  }

  // ── Student management ───────────────────────────────────────
  async function createStudent(e) {
    e.preventDefault()
    setStudentFormError('')
    if (!studentForm.username.trim() || !studentForm.password) return setStudentFormError('Username and password required')
    if (studentForm.password.length < 4) return setStudentFormError('Password must be at least 4 characters')
    setStudentFormLoading(true)
    try {
      const res = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          username: studentForm.username.trim(),
          password: studentForm.password,
          name: studentForm.name.trim() || studentForm.username.trim(),
          subjects: studentForm.subjects,
        })
      })
      if (res.error) { setStudentFormError(res.error); setStudentFormLoading(false); return }
      setStudents(prev => [...prev, res])
      setShowAddStudent(false)
      setStudentForm({ name: '', username: '', password: '', subjects: [] })
      if (!selectedStudentId) setSelectedStudentId(res.id || res._id)
    } catch { setStudentFormError('Failed to create student') }
    setStudentFormLoading(false)
  }

  async function deleteStudent(id) {
    if (!confirm('Remove this student? Their test data will NOT be deleted.')) return
    try {
      await apiFetch(`/api/students/${id}`, { method: 'DELETE' })
      setStudents(prev => prev.filter(s => s._id !== id))
    } catch { alert('Failed to delete student') }
  }

  // ── Marks editing ────────────────────────────────────────────
  async function saveEdit(row) {
    const key = `${row.id}_${row.subject}`
    const state = editingRows[key]
    const obtained = Number(state.obtained) || 0
    const total = Number(state.total) || 0
    const updated = tests.map(t => {
      if (t.id !== row.id) return t
      const m = { ...t.marks }
      m[row.subject] = { obtained, total }
      return { ...t, marks: m }
    })
    setTests(updated)
    try {
      await apiFetch(`/api/tests/${row.id}`, { method: 'PUT', body: JSON.stringify({ marks: updated.find(x => x.id === row.id).marks, date: row.date }) })
      setEditingRows(prev => { const c = { ...prev }; delete c[key]; return c })
    } catch { alert('Failed to save') }
  }

  // ── Marks history table entries ──────────────────────────────
  const historyEntries = React.useMemo(() => {
    const arr = []
    displayTests.forEach(t => {
      const id = t.id || t._id
      Object.entries(t.marks || {}).forEach(([sub, m]) => {
        const obtained = m?.obtained ?? m ?? 0
        const total = m?.total ?? (typeof m === 'number' ? 100 : 0)
        const d = new Date(t.date)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        arr.push({ id, date: t.date, monthKey, subject: sub, obtained, total, studentId: t.studentId })
      })
    })
    return arr
  }, [displayTests])

  const groupedHistory = React.useMemo(() => historyEntries.reduce((acc, e) => {
    acc[e.monthKey] = acc[e.monthKey] || []
    acc[e.monthKey].push(e)
    return acc
  }, {}), [historyEntries])

  const historyRows = groupedHistory[selectedMonth] || []

  return (
    <div className="page">
      {/* ── Header ── */}
      <header className="header">
        <h1>Teacher Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{getCurrentUser()?.name || getCurrentUser()?.username}</span>
          <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle" title={darkMode ? 'Light Mode' : 'Dark Mode'} style={{ position: 'static' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={doLogout} className="btn">Logout</button>
        </div>
      </header>

      {/* ── Subject Management ── */}
      <section className="card">
        <h2>📚 Subjects</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {subjects.length === 0
            ? <p className="hint">No subjects yet. Add your first subject below.</p>
            : subjects.map(s => (
              <div key={s._id} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                padding: '6px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.9rem'
              }}>
                {s.name}
                <button onClick={() => deleteSubject(s._id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--error)', fontSize: '1rem', padding: '0 2px', lineHeight: 1
                }} title="Delete subject">×</button>
              </div>
            ))}
        </div>
        <form onSubmit={addSubject} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: '260px' }}
            placeholder="New subject name (e.g. Math)"
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            disabled={subjectLoading}
          />
          <button type="submit" className="btn primary" disabled={subjectLoading}>Add Subject</button>
          {subjectError && <span className="error" style={{ fontSize: '0.85rem' }}>{subjectError}</span>}
        </form>
      </section>

      {/* ── Student Management ── */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>👥 Students</h2>
          <button className="btn primary" onClick={() => { setShowAddStudent(true); setStudentFormError('') }}>+ Add Student</button>
        </div>

        {students.length === 0
          ? <p className="hint">No students yet. Add your first student above.</p>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {students.map(s => (
              <div key={s._id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name || s.username}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>@{s.username}</div>
                  {s.subjects?.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: 2 }}>{s.subjects.join(', ')}</div>
                  )}
                </div>
                <button onClick={() => deleteStudent(s._id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--error)', fontSize: '1.2rem', padding: '0 4px'
                }} title="Remove student">🗑</button>
              </div>
            ))}
          </div>}

        {/* Add Student Modal */}
        {showAddStudent && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }} onClick={() => setShowAddStudent(false)}>
            <div style={{
              background: 'var(--card-bg)', padding: '28px', borderRadius: '16px',
              maxWidth: '420px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>Add New Student</h3>
              <form onSubmit={createStudent}>
                <div style={{ marginBottom: '14px' }}>
                  <label>Display Name <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                  <input className="input" value={studentForm.name} onChange={e => setStudentForm(p => ({ ...p, name: e.target.value }))} placeholder="Student's name" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label>Username <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>(student logs in with this)</span></label>
                  <input className="input" value={studentForm.username} onChange={e => setStudentForm(p => ({ ...p, username: e.target.value }))} placeholder="e.g. student1" autoComplete="off" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label>Password</label>
                  <input className="input" type="text" value={studentForm.password} onChange={e => setStudentForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 4 characters" autoComplete="off" />
                </div>
                {subjects.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <label>Assign Subjects</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {subjects.map(s => {
                        const checked = studentForm.subjects.includes(s.name)
                        return (
                          <label key={s._id} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: checked ? 'var(--accent-soft)' : 'var(--bg)',
                            border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                            color: checked ? 'var(--accent)' : 'var(--text)', fontSize: '0.85rem', fontWeight: checked ? 600 : 400
                          }}>
                            <input type="checkbox" style={{ display: 'none' }} checked={checked}
                              onChange={() => setStudentForm(p => ({
                                ...p,
                                subjects: checked ? p.subjects.filter(x => x !== s.name) : [...p.subjects, s.name]
                              }))} />
                            {s.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                {studentFormError && <div className="error" style={{ marginBottom: '12px' }}>{studentFormError}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="submit" className="btn primary" disabled={studentFormLoading} style={{ flex: 1 }}>
                    {studentFormLoading ? 'Creating...' : 'Create Student'}
                  </button>
                  <button type="button" className="btn" onClick={() => setShowAddStudent(false)} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* ── Add Marks ── */}
      <section className="card">
        <h2><span style={{ color: 'var(--accent)' }}>+</span> Add Marks</h2>
        {students.length === 0 || subjects.length === 0 ? (
          <p className="hint">Please add at least one subject and one student first.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <label>Student
                <select className="input" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name || s.username}</option>)}
                </select>
              </label>
              <label>Subject
                <select className="input" value={selectedSubjectKey} onChange={e => setSelectedSubjectKey(e.target.value)}>
                  {subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
              </label>
              <label>Date
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </label>
              <label>Week of Month
                <select className="input" value={weekNum} onChange={e => setWeekNum(e.target.value)}>
                  {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', maxWidth: '360px' }}>
              <label>Obtained
                <input className="input" type="number" min="0" placeholder="scored" value={marks.obtained} onChange={e => setMarks(p => ({ ...p, obtained: e.target.value }))} />
              </label>
              <label>Total
                <input className="input" type="number" min="1" placeholder="out of" value={marks.total} onChange={e => setMarks(p => ({ ...p, total: e.target.value }))} />
              </label>
            </div>
            {addTestError && <div className="error" style={{ marginTop: '10px' }}>{addTestError}</div>}
            <div style={{ marginTop: '20px' }}>
              <button onClick={addTest} className="btn primary">Add Test Marks</button>
            </div>
          </>
        )}
      </section>

      {/* ── Marks History ── */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Marks History</h2>
          {students.length > 0 && (
            <select className="input" style={{ maxWidth: '200px' }} value={viewingStudentId} onChange={e => { setViewingStudentId(e.target.value); setSelectedMonth(null) }}>
              <option value="all">All Students</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name || s.username}</option>)}
            </select>
          )}
        </div>

        {loading ? <p className="hint">Loading marks...</p> : displayTests.length === 0 && <p className="hint">No marks recorded yet.</p>}

        {months.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
              <button onClick={() => { const i = months.indexOf(selectedMonth); if (i < months.length - 1) setSelectedMonth(months[i + 1]) }} className="btn" disabled={!selectedMonth || selectedMonth === months[months.length - 1]}>← Prev</button>
              <strong style={{ fontSize: '1.1rem', minWidth: '180px', textAlign: 'center' }}>{toReadable(selectedMonth || months[0])}</strong>
              <button onClick={() => { const i = months.indexOf(selectedMonth); if (i > 0) setSelectedMonth(months[i - 1]) }} className="btn" disabled={!selectedMonth || selectedMonth === months[0]}>Next →</button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Student</th><th>Subject</th><th>Score</th><th>Total</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {historyRows.map(row => {
                    const key = `${row.id}_${row.subject}`
                    const isEditing = !!editingRows[key]
                    const editState = editingRows[key] || { obtained: row.obtained, total: row.total }
                    return (
                      <tr key={row.id + '_' + row.subject + '_' + row.date}>
                        <td style={{ color: 'var(--muted)' }}>{new Date(row.date).toLocaleDateString()}</td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{studentName(row.studentId)}</td>
                        <td style={{ fontWeight: 500 }}>{row.subject}</td>
                        <td>
                          {isEditing
                            ? <input type="number" min="0" className="input" style={{ width: 70, padding: '4px 8px' }} value={editState.obtained} onChange={e => setEditingRows(p => ({ ...p, [key]: { ...p[key], obtained: e.target.value } }))} />
                            : row.obtained}
                        </td>
                        <td>
                          {isEditing
                            ? <input type="number" min="0" className="input" style={{ width: 70, padding: '4px 8px' }} value={editState.total} onChange={e => setEditingRows(p => ({ ...p, [key]: { ...p[key], total: e.target.value } }))} />
                            : row.total}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isEditing ? (
                              <>
                                <button className="btn primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => saveEdit(row)}>Save</button>
                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setEditingRows(p => { const c = { ...p }; delete c[key]; return c })}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setEditingRows(p => ({ ...p, [key]: { obtained: row.obtained, total: row.total } }))}>Edit</button>
                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--error)' }} onClick={() => removeTest(row.id)}>Del</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Monthly Averages ── */}
      <section className="card">
        <h2>Monthly Averages</h2>
        {(!stats.monthly || stats.monthly.length === 0)
          ? <p className="hint">No monthly stats for selected month.</p>
          : stats.monthly.map(m => (
            <div key={m.month} style={{ marginBottom: '24px' }}>
              <div className="stat-grid">
                {Object.entries(m.stats.perSubject || {}).map(([key, val]) => (
                  <div key={key} className="stat-card">
                    <div className="stat-label">{key}</div>
                    <div className="stat-value">{val != null ? `${val}%` : '—'}</div>
                  </div>
                ))}
                <div className="stat-card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
                  <div className="stat-label" style={{ color: 'var(--accent)' }}>Month Average</div>
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>{m.stats.overall != null ? `${m.stats.overall}%` : '—'}</div>
                </div>
              </div>
            </div>
          ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* ── Progress by Subject ── */}
        <section className="card">
          <h2 onClick={() => navigate('/subject-progress')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Progress by Subject</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>View Details →</span>
          </h2>
          {displayTests.length === 0 ? <p className="hint">No data available yet.</p> : (() => {
            const subjectKeys = Array.from(new Set(displayTests.flatMap(t => Object.keys(t.marks || {})))).sort()
            const subjectStats = subjectKeys.map(key => {
              const subjectTests = displayTests.filter(t => t.marks?.[key])
              if (subjectTests.length === 0) return { subject: key, progressRate: null, count: 0 }
              const scores = subjectTests.map(t => {
                const m = t.marks[key]
                const obt = m?.obtained ?? m ?? 0
                const tot = m?.total ?? (typeof m === 'number' ? 100 : 0)
                return tot > 0 ? (obt / tot) * 100 : 0
              })
              let progressRate = null
              if (scores.length >= 2) {
                const n = scores.length
                let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
                scores.forEach((s, i) => { sumX += i; sumY += s; sumXY += i * s; sumXX += i * i })
                progressRate = Math.round(((n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)) * 100) / 100
              }
              return { subject: key, progressRate, count: subjectTests.length }
            })
            const getColor = r => r === null ? 'var(--muted)' : r > 0 ? '#22c55e' : r < 0 ? '#ef4444' : 'var(--muted)'
            const getIcon = r => r === null ? '' : r > 0 ? '📈 ' : r < 0 ? '📉 ' : '➡️ '
            return (
              <div className="stat-grid">
                {subjectStats.map(s => (
                  <div key={s.subject} className="stat-card">
                    <div className="stat-label">{s.subject}</div>
                    <div className="stat-value" style={{ opacity: s.progressRate != null ? 1 : 0.3, color: getColor(s.progressRate), fontSize: '1.5rem' }}>
                      {s.progressRate != null ? `${getIcon(s.progressRate)}${s.progressRate > 0 ? '+' : ''}${s.progressRate}%` : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                      {s.progressRate != null ? 'per test • ' : ''}{s.count} test{s.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>

        {/* ── Consistency Score ── */}
        <section className="card" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Consistency Score</h2>
            <div onMouseEnter={() => setShowConsistencyInfo(true)} style={{ display: 'inline-block', cursor: 'pointer' }}>
              <button onClick={() => setShowConsistencyInfo(true)} style={{
                background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none',
                borderRadius: '50%', width: '24px', height: '24px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.9rem', pointerEvents: 'none'
              }}>?</button>
            </div>
          </div>
          {displayTests.length === 0 ? <p className="hint">No data available.</p> : (
            <div className="stat-grid">
              {calculateConsistency(displayTests).map(stat => (
                <div key={stat.subject} className="stat-card" style={{ borderColor: stat.color }}>
                  <div className="stat-label">{stat.subject}</div>
                  <div className="stat-value" style={{ color: stat.color, fontSize: '1.2rem' }}>{stat.status}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>Variation: ±{stat.variation}%</div>
                </div>
              ))}
            </div>
          )}
          {showConsistencyInfo && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowConsistencyInfo(false)}>
              <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0 }}>Understanding Consistency</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>This score measures how much marks vary from test to test (Standard Deviation).</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  {[['#22c55e', 'Very Stable', '±0-5%', 'Excellent consistency.'], ['var(--accent)', 'Consistent', '±5-10%', 'Good steady performance.'], ['#eab308', 'Variable', '±10-15%', 'Performance fluctuates noticeably.'], ['#ef4444', 'Volatile', '>15%', 'Highly unstable performance.']].map(([color, label, range, desc]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }}></div>
                      <div><strong>{label}</strong> ({range})<div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{desc}</div></div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowConsistencyInfo(false)} className="btn primary" style={{ width: '100%', marginTop: '20px' }}>Got it</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Annual Performance ── */}
      <section className="card">
        <h2 onClick={() => navigate('/annual-average')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Annual Performance <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'normal' }}>(Year: {selectedYear})</span></span>
          <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>Detailed Analysis →</span>
        </h2>
        {(() => {
          const annual = allTimeStats.annual || []
          if (!annual.length) return <p className="hint">No annual stats available yet.</p>
          const years = annual.map(a => a.year)
          const cur = annual.find(a => a.year === selectedYear) || annual[0]
          if (!cur) return null
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                <button onClick={() => { const i = years.indexOf(selectedYear); if (i < years.length - 1) setSelectedYear(years[i + 1]) }} className="btn" disabled={years.indexOf(selectedYear) >= years.length - 1}>←</button>
                <strong style={{ fontSize: '1.2rem', minWidth: '100px', textAlign: 'center' }}>{cur.year}</strong>
                <button onClick={() => { const i = years.indexOf(selectedYear); if (i > 0) setSelectedYear(years[i - 1]) }} className="btn" disabled={years.indexOf(selectedYear) <= 0}>→</button>
              </div>
              <div className="stat-grid">
                {Object.entries(cur.stats.perSubject || {}).map(([key, val]) => (
                  <div key={key} className="stat-card">
                    <div className="stat-label">{key}</div>
                    <div className="stat-value">{val != null ? `${val}%` : '—'}</div>
                  </div>
                ))}
                <div className="stat-card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
                  <div className="stat-label" style={{ color: 'var(--accent)' }}>Overall Year</div>
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>{cur.stats.overall != null ? `${cur.stats.overall}%` : '—'}</div>
                </div>
              </div>
            </div>
          )
        })()}
      </section>

      {/* ── All-Time Stats ── */}
      <section className="card">
        <h2>All-Time Stats (Overall)</h2>
        {!allTimeStats.overall ? <p className="hint">No data.</p> : (
          <div className="stat-grid">
            {Object.entries(allTimeStats.overall.perSubject || {}).map(([key, val]) => (
              <div key={key} className="stat-card">
                <div className="stat-label">{key}</div>
                <div className="stat-value">{val != null ? `${val}%` : '—'}</div>
              </div>
            ))}
            <div className="stat-card" style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              <div className="stat-label" style={{ color: 'var(--muted)' }}>Grand Total</div>
              <div className="stat-value" style={{ color: 'inherit' }}>{allTimeStats.overall.overall != null ? `${allTimeStats.overall.overall}%` : '—'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
