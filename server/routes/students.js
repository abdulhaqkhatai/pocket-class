const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

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

function requireTeacher(req, res, next) {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'teachers only' })
    next()
}

// GET /api/students — teacher gets their students
router.get('/', verifyToken, requireTeacher, async (req, res) => {
    try {
        const students = await User.find({ role: 'student', teacherId: req.user.id })
            .select('-password')
            .sort({ username: 1 })
        res.json(students)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

// POST /api/students — teacher creates a student
router.post('/', verifyToken, requireTeacher, async (req, res) => {
    try {
        const { username, password, subjects, name } = req.body
        if (!username || !password) return res.status(400).json({ error: 'username and password required' })
        if (password.length < 4) return res.status(400).json({ error: 'password must be at least 4 characters' })

        const existing = await User.findOne({ username: username.trim().toLowerCase() })
        if (existing) return res.status(409).json({ error: 'username already taken' })

        const hashed = await bcrypt.hash(password, 10)
        const student = await User.create({
            username: username.trim().toLowerCase(),
            password: hashed,
            role: 'student',
            name: name ? name.trim() : username.trim(),
            teacherId: req.user.id,
            subjects: Array.isArray(subjects) ? subjects : [],
        })

        res.status(201).json({
            id: student._id,
            username: student.username,
            name: student.name,
            role: student.role,
            teacherId: student.teacherId,
            subjects: student.subjects,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

// PUT /api/students/:id — teacher updates student info (name, subjects)
router.put('/:id', verifyToken, requireTeacher, async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
        if (!student) return res.status(404).json({ error: 'not found' })
        if (String(student.teacherId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' })

        const { name, subjects, password } = req.body
        if (name !== undefined) student.name = name.trim()
        if (subjects !== undefined) student.subjects = subjects
        if (password && password.length >= 4) {
            student.password = await bcrypt.hash(password, 10)
        }
        await student.save()

        res.json({
            id: student._id,
            username: student.username,
            name: student.name,
            subjects: student.subjects,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

// DELETE /api/students/:id — teacher removes their student
router.delete('/:id', verifyToken, requireTeacher, async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
        if (!student) return res.status(404).json({ error: 'not found' })
        if (String(student.teacherId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' })
        await student.deleteOne()
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

module.exports = router
