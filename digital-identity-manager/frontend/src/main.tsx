import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { IdentityProvider } from './hooks/useIdentity'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'
import { I18nProvider } from './i18n'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <IdentityProvider>
              <App />
            </IdentityProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
