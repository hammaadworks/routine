import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AIAgentApp from './components/AIAgentApp.jsx'
import { initSync } from './sync.js'

initSync(() => {
  window.location.reload();
});

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/ai' ? <AIAgentApp /> : <App />}
  </StrictMode>,
)
