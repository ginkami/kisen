import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { TournamentPage } from './pages/TournamentPage.tsx'
import { TournamentEditPage } from './pages/TournamentEditPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { useAuth } from './context/AuthContext.tsx'
import './i18n'

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tournaments/new" element={<TournamentEditPage />} />
          <Route path="tournaments/:id/edit" element={<TournamentEditPage />} />
          <Route path="tournaments/:slug" element={<TournamentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
