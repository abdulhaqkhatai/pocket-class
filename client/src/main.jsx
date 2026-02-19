import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

// Add auto-reload for chunk loading failures (when new version is deployed)
window.addEventListener('error', (e) => {
  if (/Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/.test(e.message)) {
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(

  <BrowserRouter>
    <App />
  </BrowserRouter>
)
