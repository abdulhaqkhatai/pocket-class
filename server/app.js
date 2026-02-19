require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const testsRoutes = require('./routes/tests')
const subjectsRoutes = require('./routes/subjects')
const studentsRoutes = require('./routes/students')

const app = express()
app.use(express.json())

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI
const CLIENT_URL = process.env.CLIENT_URL || '*'

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URL environment variable is not set.')
  process.exit(1)
}

function redactUri(uri) {
  if (!uri) return 'none'
  try {
    return uri.replace(/:\/\/.+?:.+?@/, '://<REDACTED>@')
  } catch (e) { return uri }
}

async function connectDB() {
  console.log(`Connecting to MongoDB: ${redactUri(MONGO_URI)}`)
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 20,
    retryWrites: true,
  })
  console.log('MongoDB Atlas connected successfully')
}

async function start() {
  await connectDB()

  app.use(cors({ origin: CLIENT_URL }))

  app.use('/api/auth', authRoutes)
  app.use('/api/tests', testsRoutes)
  app.use('/api/subjects', subjectsRoutes)
  app.use('/api/students', studentsRoutes)
  app.get('/', (req, res) => res.send({ ok: true, app: 'PocketClass API' }))

  return app
}

module.exports = { app, start }
