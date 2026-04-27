import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, User, LogOut, Moon, Menu, X, Bookmark } from 'lucide-react'
import { searchMulti, getImageUrl } from '../api/animeClient'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
        setSearchResults([])
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const data = await searchMulti(searchQuery)
          // Animelek proxy returns a flat array [{id, title, poster}, ...]
          const arr = Array.isArray(data) ? data : (data.results || [])
          setSearchResults(arr.slice(0, 8))
        } catch { setSearchResults([]) }
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleResultClick = (item) => {
    navigate(`/anime/${item.id}`)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
      setSearchResults([])
    }
  }

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="header__inner container">
        <Link to="/" className="header__logo" style={{ flexDirection: 'row-reverse' }}>
          <span className="header__logo-text">Lunar<span className="header__logo-accent">Anime</span></span>
          <span className="header__logo-icon" style={{ marginLeft: '8px' }}>🌙</span>
        </Link>

        {/* RTL navigation map */}
        <nav className={`header__nav ${mobileMenuOpen ? 'header__nav--open' : ''}`}>
          <Link to="/" className="header__nav-link" onClick={() => setMobileMenuOpen(false)}>الرئيسية</Link>
          <Link to="/search" className="header__nav-link" onClick={() => setMobileMenuOpen(false)}>اكتشف</Link>
          {user && <Link to="/dashboard" className="header__nav-link" onClick={() => setMobileMenuOpen(false)}>قائمتي</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="header__nav-link" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--accent-primary)' }}>لوحة التحكم</Link>}
        </nav>

        <div className="header__actions" style={{ flexDirection: 'row-reverse' }}>
          <div className="header__search-wrapper" ref={searchRef}>
            <button
              className={`header__icon-btn ${searchOpen ? 'active' : ''}`}
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="بحث"
            >
              <Search size={20} />
            </button>

            {searchOpen && (
              <div className="header__search-dropdown glass-heavy" style={{ right: 'auto', left: 0 }}>
                <form onSubmit={handleSearchSubmit}>
                  <div className="header__search-input-wrapper">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="ابحث عن الأنمي..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="header__search-input"
                      style={{ paddingRight: '12px', paddingLeft: '32px' }}
                    />
                    <Search size={18} className="header__search-icon" style={{ left: 'auto', right: '12px' }} />
                    {searchQuery && (
                      <button
                        type="button"
                        className="header__search-clear"
                        style={{ right: 'auto', left: '12px' }}
                        onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <div className="header__search-results">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        className="header__search-result"
                        onClick={() => handleResultClick(item)}
                        style={{ textAlign: 'right', flexDirection: 'row-reverse' }}
                      >
                        <img
                          src={getImageUrl(item.poster || item.posterPath)}
                          alt=""
                          className="header__search-result-img"
                          style={{ marginLeft: '12px', marginRight: 0 }}
                        />
                        <div className="header__search-result-info">
                          <span className="header__search-result-title">
                            {item.title || item.name}
                          </span>
                          <span className="header__search-result-meta">
                            <span className="badge">الأنمي</span>
                            <span>{item.releaseDate}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {user ? (
            <div className="header__user-menu" style={{ flexDirection: 'row-reverse' }}>
              <Link to="/dashboard" className="header__icon-btn" aria-label="قائمتي">
                <Bookmark size={20} />
              </Link>
              <button className="header__user-btn" onClick={() => {
                if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                  logout()
                }
              }}>
                <div className="header__avatar">{user.username[0].toUpperCase()}</div>
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn-primary header__login-btn" style={{ flexDirection: 'row-reverse' }}>
              تسجيل الدخول
              <User size={16} style={{ marginLeft: 0, marginRight: '8px' }} />
            </Link>
          )}

          <button
            className="header__mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="تفعيل القائمة"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  )
}
