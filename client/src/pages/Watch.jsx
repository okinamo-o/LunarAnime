import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getDetails, getLauncherStream } from '../api/animeClient'
import { updateWatchProgress, getWatchlist } from '../api/backend'
import { useAuth } from '../context/AuthContext'
import CustomLauncherPlayer from '../components/CustomLauncherPlayer'
import EpisodeBrowser from '../components/EpisodeBrowser'
import AdSlot from '../components/AdSlot'
import ADS_CONFIG from '../config/ads'
import useSEO from '../hooks/useSEO'
import './Watch.css'

export default function Watch() {
  const { id } = useParams()
  const type = 'anime'
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [details, setDetails] = useState(null)
  const [streamData, setStreamData] = useState(null)
  const [launcherLoading, setLauncherLoading] = useState(false)
  const [launcherError, setLauncherError] = useState('')
  const [watchedEpisodes, setWatchedEpisodes] = useState([])
  
  const isInitialLoad = useRef(true)

  const [season, setSeason] = useState(parseInt(searchParams.get('s')) || 1)
  const [episode, setEpisode] = useState(parseInt(searchParams.get('e')) || 1)
  const [loading, setLoading] = useState(true)

  useSEO({
    title: details ? `${details.title || details.name} - حلقة ${episode}` : 'مشاهدة الأنمي',
    description: `شاهد ${details?.title || 'الحلقة'} بجودة عالية على LunarAnime.`
  })

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await getDetails(type, id)
        setDetails(data)
        
        // If no season/episode in URL, check user's watchlist for progress
        if (user && !searchParams.get('s') && !searchParams.get('e')) {
          try {
            const watchlist = await getWatchlist()
            const item = watchlist.find(i => i.animeId === id)
            if (item?.lastSeason) {
               setSeason(item.lastSeason)
               if (item.lastEpisode) setEpisode(item.lastEpisode)
               if (item.watchedEpisodesList) setWatchedEpisodes(item.watchedEpisodesList)
            }
          } catch (pErr) {
            console.warn('Failed to load progress:', pErr)
          }
        }
      } catch (err) {
        console.error('Failed to load anime details:', err)
      } finally {
        setLoading(false)
        isInitialLoad.current = false
      }
    }
    loadDetails()
  }, [type, id, user]) // Removed searchParams to prevent loop


  useEffect(() => {
    if (loading) return

    let cancelled = false
    const resolveLauncher = async () => {
      setLauncherLoading(true)
      setLauncherError('')

      try {
        const data = await getLauncherStream(type, id, season, episode)
        if (cancelled) return
        setStreamData(data)
      } catch (err) {
        if (cancelled) return
        console.warn('Launcher failed:', err)
        setStreamData(null)
        setLauncherError('غير قادر على استخراج الحلقة. قد تكون غير متوفرة حاليا.')
      } finally {
        if (!cancelled) setLauncherLoading(false)
      }
    }

    resolveLauncher()
    return () => {
      cancelled = true
    }
  }, [loading, type, id, season, episode])

  // Auto-save progress whenever you watch anything (including first load)
  useEffect(() => {
    if (!user || !details || loading) return
    
    const saveProgress = async () => {
       try {
          const metadata = {
            title: details.title || details.name,
            posterPath: details.poster,
            backdropPath: details.backdrop || details.poster,
            voteAverage: 0,
            releaseDate: details.releaseDate || ''
          };
          
          await updateWatchProgress(id, season, episode, metadata)
          
          // Update local watched list
          setWatchedEpisodes(prev => {
            if (prev.includes(episode)) return prev;
            return [...prev, episode];
          });
       } catch (err) {
         console.warn('Failed to save progress', err)
       }
    }
    
    setSearchParams({ s: season, e: episode }, { replace: true })
    saveProgress()
  }, [season, episode, type, id, user, details, setSearchParams])

  const title = details?.title || details?.name || 'جاري التحميل...'
  
  // Scraper returns details.seasons array.
  const seasons = details?.seasons || []
  
  // Find current season Object
  const currentSeason = seasons.find(s => s.seasonNumber === season) || seasons[0] || { episodes: [] }
  const totalEpisodes = currentSeason.episodes.length || 0

  const handleNextEpisode = () => {
    if (!currentSeason.episodes.length) return;
    const currentIndex = currentSeason.episodes.findIndex(e => e.id === episode || e.episodeNumber === episode);
    if (currentIndex !== -1 && currentIndex < currentSeason.episodes.length - 1) {
      const nextEp = currentSeason.episodes[currentIndex + 1];
      setEpisode(nextEp.episodeNumber);
      setSearchParams({ s: season, e: nextEp.episodeNumber }, { replace: true });
    }
  }

  const handlePrevEpisode = () => {
    if (!currentSeason.episodes.length) return;
    const currentIndex = currentSeason.episodes.findIndex(e => e.id === episode || e.episodeNumber === episode);
    if (currentIndex > 0) {
      const prevEp = currentSeason.episodes[currentIndex - 1];
      setEpisode(prevEp.episodeNumber);
      setSearchParams({ s: season, e: prevEp.episodeNumber }, { replace: true });
    }
  }

  return (
    <div className="watch-page">
      {/* Info Bar */}
      <div className="watch-page__topbar glass-heavy" style={{ flexDirection: 'row-reverse' }}>
        <div className="watch-page__back" style={{ gap: '0.8rem', flexDirection: 'row-reverse' }}>
          <span className="watch-page__title-text">{title}</span>
          <span className="watch-page__ep-label">الحلقة {episode}</span>
        </div>
        <Link
          to={`/anime/${id}`}
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
        >
          صفحة الأنمي
        </Link>
      </div>

      {launcherError && (
        <div className="watch-page__launcher-notice">
          {launcherError}
        </div>
      )}

      {/* Player */}
      <div className="watch-page__player-wrapper">
        {loading || launcherLoading ? (
          <div className="watch-page__loading">
            <div className="watch-page__loader" />
            <p>{loading ? 'جاري التحميل...' : 'جاري استخراج السيرفرات القوية...'}</p>
          </div>
        ) : streamData ? (
          streamData.isEmbed ? (
            <iframe
              key={streamData.masterUrl}
              src={streamData.masterUrl}
              className="watch-page__player"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              frameBorder="0"
              title={`مشاهدة ${title}`}
            />
          ) : (
            <CustomLauncherPlayer
              key={`anime-${id}-${season}-${episode}-${streamData.masterUrl}`}
              streamData={streamData}
              title={title}
            />
          )
        ) : (
          <div className="watch-page__player glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>الأنمي غير متاح</h3>
            <p style={{ color: '#a0a0a5' }}>لم نتمكن من العثور على الحلقة في سيرفراتنا.</p>
          </div>
        )}
      </div>

      {ADS_CONFIG.ENABLED && ADS_CONFIG.placements.watchBanner && (
        <AdSlot type="banner" />
      )}

      {/* Episode Browser */}
      {seasons.length > 0 && currentSeason.episodes.length > 0 && (
        <div className="watch-page__episodes glass-heavy">
          <div className="watch-page__episodes-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>قائمة الحلقات</h3>
            <div className="watch-page__ep-nav" style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn-secondary" onClick={handlePrevEpisode} disabled={episode === currentSeason.episodes[currentSeason.episodes.length - 1]?.episodeNumber}>
                السابق
              </button>
              <button className="btn-primary" onClick={handleNextEpisode} disabled={episode === currentSeason.episodes[0]?.episodeNumber}>
                التالي
              </button>
            </div>
          </div>

          <EpisodeBrowser
            episodes={currentSeason.episodes}
            currentEpisode={episode}
            watchedEpisodes={watchedEpisodes}
            onSelect={(ep) => {
              setEpisode(ep);
              setSearchParams({ s: season, e: ep });
            }}
          />
          
          {/* Download Section (Future Animelek Integration) */}
          <div className="watch-page__downloads" style={{ marginTop: '2rem', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
             <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📥 روابط التحميل (جودة عالية)
             </h4>
             <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: '#a0a0a5' }}>جاري استخراج الروابط المباشرة من Animelek...</span>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
