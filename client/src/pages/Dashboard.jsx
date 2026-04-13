import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, Play, Tv } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getWatchlist, removeFromWatchlist } from '../api/backend'
import { getImageUrl } from '../api/animeClient'
import useSEO from '../hooks/useSEO'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  useSEO({ title: 'قائمتي', description: 'إدارة قائمة الأنمي المفضلة لديك ومتابعة تقدم المشاهدة.' })
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    loadWatchlist()
  }, [user, navigate])

  const loadWatchlist = async () => {
    try {
      const data = await getWatchlist()
      setItems(data)
    } catch (err) {
      console.error('Failed to load watchlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (animeId) => {
    try {
      const updated = await removeFromWatchlist(animeId)
      setItems(updated)
    } catch (err) {
      console.error(err)
    }
  }

  if (!user) return null

  return (
    <div className="dashboard-page page-enter container" style={{ direction: 'rtl' }}>
      <div className="dashboard-page__header" style={{ textAlign: 'right' }}>
        <h1>قائمتي</h1>
        <p className="dashboard-page__subtitle">مرحبًا، <strong>{user.username}</strong></p>
      </div>

      {/* Stats */}
      <div className="dashboard-page__stats" style={{ direction: 'rtl' }}>
        <div className="stat-card glass" style={{ flexDirection: 'row-reverse' }}>
          <Tv size={24} className="stat-card__icon" />
          <div style={{ textAlign: 'right' }}>
            <span className="stat-card__value">{items.length}</span>
            <span className="stat-card__label">عدد الأنميات</span>
          </div>
        </div>
        <div className="stat-card glass" style={{ flexDirection: 'row-reverse' }}>
          <Play size={24} className="stat-card__icon" />
          <div style={{ textAlign: 'right' }}>
            <span className="stat-card__value">
              {items.reduce((sum, i) => sum + (i.watchedEpisodesList?.length || 0), 0)}
            </span>
            <span className="stat-card__label">حلقة تمت مشاهدتها</span>
          </div>
        </div>
      </div>

      {/* Section heading */}
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <h2 style={{ fontSize: '1.3rem' }}>الأنميات المحفوظة</h2>
      </div>

      {/* Watchlist */}
      {loading ? (
        <div className="dashboard-page__loading">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="dashboard-page__empty" style={{ textAlign: 'center' }}>
          <p>قائمتك فارغة</p>
          <Link to="/" className="btn-primary">اكتشف الأنمي</Link>
        </div>
      ) : (
        <div className="dashboard-page__list">
          {items.map((item) => (
            <div
              key={item._id || item.animeId}
              className="watchlist-item glass"
              style={{ flexDirection: 'row-reverse' }}
            >
              <Link to={`/anime/${item.animeId}`} className="watchlist-item__poster-link">
                <img
                  src={getImageUrl(item.posterPath)}
                  alt={item.title}
                  className="watchlist-item__poster"
                />
              </Link>
              <div className="watchlist-item__info" style={{ textAlign: 'right' }}>
                <Link to={`/anime/${item.animeId}`} className="watchlist-item__title">
                  {item.title}
                </Link>
                <div className="watchlist-item__meta" style={{ justifyContent: 'flex-end' }}>
                  <span className="badge">أنمي</span>
                  {item.lastEpisode ? (
                    <span className="badge badge--accent">
                      الحلقة {item.lastEpisode}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="watchlist-item__actions" style={{ flexDirection: 'row-reverse' }}>
                <Link
                  to={`/watch/anime/${item.animeId}${item.lastEpisode ? `?s=1&e=${item.lastEpisode}` : ''}`}
                  className="btn-primary watchlist-item__play"
                  title="متابعة المشاهدة"
                >
                  ▶
                </Link>
                <button
                  className="watchlist-item__action-btn watchlist-item__action-btn--danger"
                  onClick={() => handleRemove(item.animeId)}
                  title="إزالة"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
