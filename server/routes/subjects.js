const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const Subject = require('../models/Subject')

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

// GET /api/subjects — teacher gets their own subjects
router.get('/', verifyToken, requireTeacher, async (req, res) => {
    try {
        const subjects = await Subject.find({ teacherId: req.user.id }).sort({ name: 1 })
        res.json(subjects)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

// POST /api/subjects — teacher creates a subject
router.post('/', verifyToken, requireTeacher, async (req, res) => {
    try {
        const { name } = req.body
        if (!name || !name.trim()) return res.status(400).json({ error: 'subject name required' })

        const subject = await Subject.create({ name: name.trim(), teacherId: req.user.id })
        res.status(201).json(subject)
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'subject already exists' })
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

// DELETE /api/subjects/:id — teacher deletes their subject
router.delete('/:id', verifyToken, requireTeacher, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id)
        if (!subject) return res.status(404).json({ error: 'not found' })
        if (String(subject.teacherId) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' })
        await subject.deleteOne()
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'server error' })
    }
})

module.exports = router
