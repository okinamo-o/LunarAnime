import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { PopunderLoader } from './components/AdSlot'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './context/AuthContext'

const Home = lazy(() => import('./pages/Home'))
const MovieDetails = lazy(() => import('./pages/MovieDetails'))
const Watch = lazy(() => import('./pages/Watch'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Auth = lazy(() => import('./pages/Auth'))
const Search = lazy(() => import('./pages/Search'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))
import './App.css'

function App() {
  const { loading: authLoading } = useAuth()
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
          <Suspense fallback={
            <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
              <div className="loader"></div>
            </div>
          }>
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
          </Suspense>
        </main>
        {!isWatchPage && <Footer />}
      </div>
    </ErrorBoundary>
  )
}

export default App
