import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { TournamentPage } from './pages/TournamentPage.tsx'
import { useAuth } from './context/AuthContext.tsx'
import './i18n'

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-center font-medium text-indigo-600">Loading...</p>
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginRoute />} />
          <Route path="tournaments/:slug" element={<TournamentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
