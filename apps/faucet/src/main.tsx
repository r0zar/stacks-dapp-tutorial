import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TokenContractProvider } from './contexts/TokenContractContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokenContractProvider>
      <App />
    </TokenContractProvider>
  </StrictMode>,
)
