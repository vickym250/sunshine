import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 🔥 Toaster Import
import { Toaster } from 'react-hot-toast'
import { SidebarProvider } from './component/SidebarContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="top-center" />
    <SidebarProvider>
    <App />
    </SidebarProvider>
  </StrictMode>,
)
