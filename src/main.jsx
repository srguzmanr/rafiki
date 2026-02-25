// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Bootstrap 5 CSS — included via CDN in index.html
// Bootstrap JS not needed (we're not using collapse/modal JS — we render modals ourselves)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
