const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], required: true },
  // For teachers: their display name
  name: { type: String, default: '' },
  // For students: which teacher created them (tenant isolation)
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // For students: which subjects they are enrolled in
  subjects: { type: [String], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)
