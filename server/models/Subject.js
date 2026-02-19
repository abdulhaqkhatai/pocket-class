const mongoose = require('mongoose')

const SubjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

// A teacher can't have two subjects with the same name
SubjectSchema.index({ name: 1, teacherId: 1 }, { unique: true })

module.exports = mongoose.model('Subject', SubjectSchema)
