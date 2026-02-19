const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'

// Teacher Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'username and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' })

    const existing = await User.findOne({ username: username.trim().toLowerCase() })
    if (existing) return res.status(409).json({ error: 'username already taken' })

    const hashed = await bcrypt.hash(password, 10)
    const teacher = await User.create({
      username: username.trim().toLowerCase(),
      password: hashed,
      role: 'teacher',
      name: name ? name.trim() : username.trim(),
    })

    const token = jwt.sign(
      { id: teacher._id, role: 'teacher', teacherId: teacher._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.status(201).json({
      token,
      user: { id: teacher._id, username: teacher.username, name: teacher.name, role: 'teacher' }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

// Login (teacher or student)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'username and password required' })

    const user = await User.findOne({ username: username.trim().toLowerCase() })
    if (!user) return res.status(401).json({ error: 'invalid credentials' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'invalid credentials' })

    // Build JWT payload with tenant info
    const payload = {
      id: user._id,
      role: user.role,
    }

    if (user.role === 'teacher') {
      payload.teacherId = user._id
    } else {
      // student: carry their teacherId for tenant scope
      payload.teacherId = user.teacherId
      payload.studentId = user._id
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name || user.username,
        role: user.role,
        teacherId: user.teacherId || null,
        subjects: user.subjects || [],
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

module.exports = router
