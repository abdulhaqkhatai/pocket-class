export function weeklyAndMonthlyStats(tests) {
  // tests: [{id, date (iso), marks: {subject: {obtained, total} }}]
  if (!tests || tests.length === 0) return { weekly: null, monthly: null }

  // Helper: group by week (ISO week start Mon) and by month
  const byWeek = new Map()
  const byMonth = new Map()
  const byYear = new Map()

  tests.forEach(t => {
    const d = new Date(t.date)
    const yearKey = String(d.getFullYear())
    const monKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    // If a week-of-month (1..5) is provided, use that as the week grouping within the month
    let wkKey
    if (t.week && Number.isInteger(Number(t.week))) {
      wkKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-w${t.week}`
    } else {
      const wkStart = getWeekStart(d)
      wkKey = wkStart.toISOString().slice(0, 10)
    }

    if (!byWeek.has(wkKey)) byWeek.set(wkKey, [])
    byWeek.get(wkKey).push(t)

    if (!byMonth.has(monKey)) byMonth.set(monKey, [])
    byMonth.get(monKey).push(t)

    if (!byYear.has(yearKey)) byYear.set(yearKey, [])
    byYear.get(yearKey).push(t)
  })

  function avgForGroup(arr) {
    // We'll compute per-subject average percentage (0-100) and overall average across all subjects and tests
    const subjects = {}
    let overallSum = 0, overallCount = 0
    arr.forEach(test => {
      Object.entries(test.marks || {}).forEach(([sub, m]) => {
        // m can be {obtained, total} or a number (legacy). Convert to percentage.
        let pct = null
        if (m && typeof m === 'object' && typeof m.obtained === 'number' && typeof m.total === 'number' && m.total > 0) {
          pct = (m.obtained / m.total) * 100
        } else if (typeof m === 'number') {
          pct = m
        }
        if (pct === null || Number.isNaN(pct)) return
        subjects[sub] = subjects[sub] || { sum: 0, count: 0 }
        subjects[sub].sum += pct
        subjects[sub].count += 1
        overallSum += pct
        overallCount += 1
      })
    })
    const perSubject = {}
    Object.entries(subjects).forEach(([k, v]) => {
      perSubject[k] = +(v.sum / v.count).toFixed(2)
    })
    const overall = overallCount > 0 ? +(overallSum / overallCount).toFixed(2) : null
    return { perSubject, overall }
  }

  // For weekly stats, average each week across subjects, then produce an array sorted desc by week
  const weekly = Array.from(byWeek.entries()).map(([k, arr]) => ({ week: k, stats: avgForGroup(arr) }))
  weekly.sort((a, b) => b.week.localeCompare(a.week))

  const monthly = Array.from(byMonth.entries()).map(([k, arr]) => ({ month: k, stats: avgForGroup(arr) }))
  monthly.sort((a, b) => b.month.localeCompare(a.month))

  const annual = Array.from(byYear.entries()).map(([k, arr]) => ({ year: k, stats: avgForGroup(arr) }))
  annual.sort((a, b) => b.year.localeCompare(a.year))

  const overall = avgForGroup(tests)

  return { weekly, monthly, annual, overall }
}

export function calculateConsistency(tests) {
  if (!tests || tests.length === 0) return []

  const subjects = {}
  tests.forEach(t => {
    Object.entries(t.marks || {}).forEach(([sub, m]) => {
      const obtained = m?.obtained ?? m ?? 0
      const total = m?.total ?? (typeof m === 'number' ? 100 : 0)
      const pct = total > 0 ? (obtained / total) * 100 : 0

      subjects[sub] = subjects[sub] || []
      subjects[sub].push(pct)
    })
  })

  return Object.entries(subjects).map(([subject, scores]) => {
    if (scores.length < 2) {
      return { subject, label: subject, variation: 0, status: 'New', color: 'var(--muted)' }
    }

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    let status = 'Consistent'
    let color = '#22c55e' // green

    if (stdDev <= 5) {
      status = 'Very Stable'
      color = '#22c55e'
    } else if (stdDev <= 10) {
      status = 'Consistent'
      color = 'var(--accent)'
    } else if (stdDev <= 15) {
      status = 'Variable'
      color = '#eab308' // yellow/orange
    } else {
      status = 'Volatile'
      color = '#ef4444' // red
    }

    return {
      subject,
      variation: Math.round(stdDev * 10) / 10,
      status,
      color,
      count: scores.length
    }
  })
}

function getWeekStart(d) {
  // return Monday of that week
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // make Monday=0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}
