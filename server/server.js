require('dotenv').config()
const { start } = require('./app')

const PORT = process.env.PORT || 5000

if (require.main === module) {
  start()
    .then(appInstance => {
      appInstance.listen(PORT, () => console.log(`PocketClass server running on port ${PORT}`))
    })
    .catch(err => {
      console.error('Failed to start server:', err)
      process.exit(1)
    })
}
