const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const Test = require('../models/Test')

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'

function verifyToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'no token' })
  const parts = auth.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth header' })
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'invalid token' })
  }
}

// GET /api/tests — scoped by role
//   Teacher: all tests in their class (any student)
//   Student: only their own tests
//   Both scoped to teacherId for full tenant isolation
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {}
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id
    } else {
      // student: their own tests only, also verify they belong to same teacher
      query.studentId = req.user.id
      query.teacherId = req.user.teacherId
    }

    // Optional: filter by studentId for teacher viewing a specific student
    if (req.user.role === 'teacher' && req.query.studentId) {
      query.studentId = req.query.studentId
    }

    const tests = await Test.find(query).sort({ date: -1 })
    res.json(tests)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

// POST /api/tests — teacher adds marks (must specify studentId)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'teachers only' })

    const { date, marks, studentId, week } = req.body
    if (!date || !marks) return res.status(400).json({ error: 'date and marks required' })
    if (!studentId) return res.status(400).json({ error: 'studentId required — specify which student this test is for' })

    const t = await Test.create({
      date: new Date(date),
      marks,
      week: week ? Number(week) : undefined,
      teacherId: req.user.id,
      studentId,
      createdBy: req.user.id,
    })
    res.json(t)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

// PUT /api/tests/:id — teacher updates marks
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'forbidden' })
    const t = await Test.findById(req.params.id)
    if (!t) return res.status(404).json({ error: 'not found' })
    // Ensure test belongs to this teacher
    if (String(t.teacherId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' })

    const { marks, date } = req.body
    if (marks) t.marks = marks
    if (date) t.date = new Date(date)
    await t.save()
    res.json(t)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

// DELETE /api/tests/:id — teacher deletes
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'forbidden' })
    const t = await Test.findById(req.params.id)
    if (!t) return res.status(404).json({ error: 'not found' })
    if (String(t.teacherId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' })
    await t.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

module.exports = router
