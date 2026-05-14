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
  const [activeServer, setActiveServer] = useState(0)
  
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
    if (loading || !details) return

    let cancelled = false
    const resolveLauncher = async () => {
      setLauncherLoading(true)
      setLauncherError('')

      try {
        // Find the episode slug from details data
        const allEps = details?.seasons?.[0]?.episodes || []
        const epObj = allEps.find(e => e.episodeNumber === episode)
        const episodeSlug = epObj?.id || `${id}-${episode}-%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9`
        
        const data = await getLauncherStream(type, id, season, episodeSlug)
        if (cancelled) return
        setStreamData(data)
        setActiveServer(0)
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
  }, [loading, type, id, season, episode, details])

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
  
  // Animelek doesn't have real seasons — all episodes are in one list
  const currentSeason = details?.seasons?.[0] || { episodes: [] }
  const totalEpisodes = currentSeason.episodes.length || 0

  const handleNextEpisode = () => {
    if (!currentSeason.episodes.length) return;
    const currentIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === episode);
    if (currentIndex !== -1 && currentIndex < currentSeason.episodes.length - 1) {
      const nextEp = currentSeason.episodes[currentIndex + 1];
      setEpisode(nextEp.episodeNumber);
      setSearchParams({ s: season, e: nextEp.episodeNumber }, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const handlePrevEpisode = () => {
    if (!currentSeason.episodes.length) return;
    const currentIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === episode);
    if (currentIndex > 0) {
      const prevEp = currentSeason.episodes[currentIndex - 1];
      setEpisode(prevEp.episodeNumber);
      setSearchParams({ s: season, e: prevEp.episodeNumber }, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        ) : streamData && (streamData.masterUrl || (streamData.servers && streamData.servers.length > 0)) ? (
          <>
            <iframe
              key={streamData.servers?.[activeServer]?.url || streamData.masterUrl}
              src={streamData.servers?.[activeServer]?.url || streamData.masterUrl}
              className="watch-page__player"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              frameBorder="0"
              title={`مشاهدة ${title}`}
            />
            {/* Server Switching Buttons */}
            {streamData.servers && streamData.servers.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', padding: '0 1rem' }}>
                {streamData.servers.map((srv, i) => (
                  <button
                    key={i}
                    className={i === activeServer ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setActiveServer(i)}
                    style={{ fontSize: '0.8rem', padding: '6px 16px', textTransform: 'capitalize' }}
                  >
                    {srv.name} {srv.quality && `| ${srv.quality}`}
                  </button>
                ))}
              </div>
            )}
          </>
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
      {currentSeason.episodes.length > 0 && (
        <div className="watch-page__episodes glass-heavy">
          <div className="watch-page__episodes-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>قائمة الحلقات</h3>
            <div className="watch-page__ep-nav" style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn-secondary" onClick={handlePrevEpisode} disabled={episode <= (currentSeason.episodes[0]?.episodeNumber || 1)}>
                السابق
              </button>
              <button className="btn-primary" onClick={handleNextEpisode} disabled={episode >= (currentSeason.episodes[currentSeason.episodes.length - 1]?.episodeNumber || episode)}>
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
          
          {/* Download Section - Real links from servers */}
          {streamData?.servers && streamData.servers.length > 0 && (
          <div className="watch-page__downloads" style={{ marginTop: '2rem', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
             <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📥 روابط التحميل المباشرة
             </h4>
             <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                {streamData.servers.map((srv, i) => (
                  <a 
                    key={i}
                    href={srv.url.replace('/embed-', '/').replace('.html', '').replace('/e/', '/d/')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '8px 20px', textTransform: 'capitalize' }}
                  >
                    📥 {srv.name} {srv.quality && `| ${srv.quality}`}
                  </a>
                ))}
             </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}
