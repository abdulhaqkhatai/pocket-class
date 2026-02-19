const mongoose = require('mongoose')

const TestSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  marks: { type: mongoose.Schema.Types.Mixed, required: true },
  // Multi-tenancy: which teacher's class this test belongs to
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Which student this test is for
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Week number within the month (1-5)
  week: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Test', TestSchema)
