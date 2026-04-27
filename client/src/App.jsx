import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { PopunderLoader } from './components/AdSlot'
import Home from './pages/Home'
import MovieDetails from './pages/MovieDetails'
import Watch from './pages/Watch'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import Search from './pages/Search'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './context/AuthContext'
import './App.css'

function App() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const isWatchPage = location.pathname.startsWith('/watch/')

  if (authLoading) {
    return (
      <div className="loading-screen" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <PopunderLoader />
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anime/:id" element={<MovieDetails />} />
            <Route path="/watch/:type/:id" element={<Watch />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<Search />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isWatchPage && <Footer />}
      </div>
    </ErrorBoundary>
  )
}

export default App
