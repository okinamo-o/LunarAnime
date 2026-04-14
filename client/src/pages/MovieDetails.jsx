import { useState, useEffect } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { Play, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getDetails, getImageUrl } from '../api/animeClient'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../api/backend'
import { useAuth } from '../context/AuthContext'
import AdSlot from '../components/AdSlot'
import EpisodeBrowser from '../components/EpisodeBrowser'
import ADS_CONFIG from '../config/ads'
import useSEO from '../hooks/useSEO'
import './MovieDetails.css'

export default function MovieDetails() {
  const { id } = useParams()
  const location = useLocation()
  const mediaType = 'anime'
  const { user } = useAuth()
  const navigate = useNavigate()

  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [overviewExpanded, setOverviewExpanded] = useState(false)

  useSEO({
    title: details?.title || details?.name || 'تفاصيل الأنمي',
    description: details?.overview?.slice(0, 160)
  })

  useEffect(() => {
    window.scrollTo(0, 0)
    const load = async () => {
      setLoading(true)
      try {
        const data = await getDetails(mediaType, id)
        setDetails(data)

        if (user) {
          try {
            const wl = await getWatchlist()
            setInWatchlist(wl.some(i => i.animeId.toString() === id.toString()))
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load details:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, mediaType, user])

  const handleWatchlistToggle = async () => {
    if (!user) return
    try {
      if (inWatchlist) {
        await removeFromWatchlist(id)
        setInWatchlist(false)
      } else {
        await addToWatchlist({
          animeId: id,
          mediaType: 'anime',
          title: details.title || details.name,
          posterPath: details.poster,
          backdropPath: details.backdrop || details.poster,
          voteAverage: 0,
          releaseDate: ''
        })
        setInWatchlist(true)
      }
    } catch (err) {
      console.error('Watchlist error:', err)
    }
  }

  if (loading) {
    return (
      <div className="details-page details-page--loading">
        <div className="details-page__hero-skeleton skeleton" />
        <div className="container">
          <div className="skeleton" style={{ width: '60%', height: 40, marginBottom: 20 }} />
          <div className="skeleton" style={{ width: '100%', height: 120 }} />
        </div>
      </div>
    )
  }

  if (!details) return <div className="container" style={{ padding: '100px 24px', textAlign: 'right' }}>لم يتم العثور على الأنمي.</div>

  const title = details.title || details.name
  const overview = details.overview || 'لا توجد قصة متاحة.'
  const isLongOverview = overview.length > 300
  const seasons = details.seasons || []
  const episodes = seasons[0]?.episodes || []

  return (
    <div className="details-page page-enter">
      {/* Hero Backdrop */}
      <div className="details-page__hero">
        {getImageUrl(details.backdrop || details.poster, id).includes('placehold.co') ? (
          <div className="details-page__backdrop" style={{ background: 'linear-gradient(45deg, #1A1A29 0%, #0D0D14 100%)' }} />
        ) : (
          <img
            src={getImageUrl(details.backdrop || details.poster, id)}
            alt={title}
            className="details-page__backdrop"
            style={{ objectPosition: 'top center' }}
          />
        )}
        <div className="details-page__hero-gradient" />
        <div className="details-page__hero-gradient-left" />
      </div>

      <div className="details-page__body container" style={{ direction: 'rtl' }}>
        <div className="details-page__main" style={{ flexDirection: 'row-reverse' }}>
          {/* Poster */}
          <div className="details-page__poster-col">
            <img
              src={getImageUrl(details.poster, id)}
              alt={title}
              className="details-page__poster"
            />
          </div>

          {/* Info */}
          <div className="details-page__info-col" style={{ textAlign: 'right' }}>
            <h1 className="details-page__title">{title}</h1>

            <div className="details-page__meta" style={{ justifyContent: 'flex-start' }}>
              {details.genres && details.genres.map((g, i) => (
                <span key={i} className="badge">{typeof g === 'string' ? g : g.name}</span>
              ))}
            </div>

            {/* Overview */}
            <div className="details-page__overview-wrapper">
              <p className={`details-page__overview ${!overviewExpanded && isLongOverview ? 'collapsed' : ''}`}>
                {overview}
              </p>
              {isLongOverview && (
                <button
                  className="details-page__read-more"
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                >
                  {overviewExpanded ? <><ChevronUp size={14} /> أقل</> : <><ChevronDown size={14} /> اقرأ المزيد</>}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="details-page__actions" style={{ justifyContent: 'flex-start', gap: '12px' }}>
              <Link to={`/watch/anime/${id}`} className="btn-primary" style={{ flexDirection: 'row-reverse', gap: '8px' }}>
                شاهد الآن <Play size={18} fill="white" />
              </Link>
              {user && (
                <button
                  className={`btn-secondary ${inWatchlist ? 'btn-secondary--active' : ''}`}
                  onClick={handleWatchlistToggle}
                >
                  {inWatchlist ? <><Check size={16} /> في القائمة</> : <><Plus size={16} /> أضف للقائمة</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Episodes Browser */}
        {episodes.length > 0 && (
          <div className="details-page__seasons" style={{ textAlign: 'right' }}>
            <EpisodeBrowser
              episodes={episodes}
              currentEpisode={0}
              onSelect={(epNum) => navigate(`/watch/anime/${id}?s=1&e=${epNum}`)}
            />
          </div>
        )}

        {/* Ad Slot */}
        {ADS_CONFIG.ENABLED && ADS_CONFIG.placements.detailsSidebar && (
          <AdSlot type="rectangle" />
        )}
      </div>
    </div>
  )
}
