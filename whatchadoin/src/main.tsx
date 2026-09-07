import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import AIAgentApp from './components/AIAgentApp'
import { initSync } from './sync'

initSync(() => {
  window.location.reload();
});

const path = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/ai' ? <AIAgentApp /> : <App />}
  </StrictMode>,
)
