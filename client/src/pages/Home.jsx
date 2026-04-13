import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import MovieCarousel from '../components/MovieCarousel'
import AdSlot from '../components/AdSlot'
import ADS_CONFIG from '../config/ads'
import { getTrending, getPopular } from '../api/animeClient'
import { getWatchlist, removeFromWatchlist } from '../api/backend'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import './Home.css'

export default function Home() {
  const { user } = useAuth()
  useSEO({ 
    title: 'الرئيسية', 
    description: 'LunarAnime - استمتع بمشاهدة أحدث حلقات الأنمي المترجم بجودة عالية وسيرفرات سريعة.' 
  })
  const [trending, setTrending] = useState([])
  const [popular, setPopular] = useState([])
  const [continueWatching, setContinueWatching] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [trendData, popData] = await Promise.all([
        getTrending(),
        getPopular()
      ])
      setTrending(Array.isArray(trendData) ? trendData : [])
      setPopular(Array.isArray(popData) ? popData : [])

      if (user) {
        try {
          const wl = await getWatchlist()
          const ongoing = wl.filter(i => i.lastSeason || i.lastEpisode || !i.watched)
            .map(i => ({
                 ...i,
                 id: i.animeId,
                 poster_path: i.posterPath,
                 media_type: 'anime'
            }))
            .reverse()
          setContinueWatching(ongoing)
        } catch (wlErr) {
          console.warn('Watchlist unavailable (not logged in?):', wlErr.message)
        }
      }
    } catch (err) {
      console.error('Failed to load home data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user])

  const handleRemoveHome = async (id, type) => {
    try {
      await removeFromWatchlist(id, type)
      // Refresh list locally
      setContinueWatching(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Failed to remove from history:', err)
    }
  }

  const showAds = ADS_CONFIG.ENABLED && ADS_CONFIG.placements.homeBanners

  return (
    <div className="home-page page-enter">
      <Hero />

      <div className="home-page__carousels">
        {continueWatching.length > 0 && (
          <MovieCarousel
            title="🍿 متابعة المشاهدة"
            items={continueWatching}
            loading={loading}
            onRemove={handleRemoveHome}
          />
        )}
        <MovieCarousel
          title="🔥 الترند هذا الأسبوع"
          items={trending}
          loading={loading}
        />

        {showAds && <AdSlot type="banner" />}

        <MovieCarousel
          title="🎬 الأنمي الأكثر شعبية"
          items={popular}
          loading={loading}
        />

        {showAds && <AdSlot type="banner" />}
      </div>
    </div>
  )
}
