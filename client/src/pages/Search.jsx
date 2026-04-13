import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import { searchMulti, getPopular, discoverByGenre } from '../api/animeClient'
import MovieCard, { MovieCardSkeleton } from '../components/MovieCard'
import AdSlot from '../components/AdSlot'
import ADS_CONFIG from '../config/ads'
import useSEO from '../hooks/useSEO'
import './Search.css'

const MOOD_TAGS = [
  { label: 'أكشن', slug: 'أكشن' },
  { label: 'مغامرات', slug: 'مغامرات' },
  { label: 'كوميدي', slug: 'كوميدي' },
  { label: 'دراما', slug: 'دراما' },
  { label: 'رومانسي', slug: 'رومانسي' },
  { label: 'ايسيكاي', slug: 'ايسيكاي' },
  { label: 'سحر', slug: 'سحر' },
  { label: 'خيال', slug: 'فنتازيا' },
  { label: 'خيال علمي', slug: 'خيال-علمي' },
  { label: 'غموض', slug: 'غموض' },
  { label: 'نفسي', slug: 'نفسي' },
  { label: 'قوى خارقة', slug: 'قوى-خارقة' },
  { label: 'شونين', slug: 'شونين' },
  { label: 'سينين', slug: 'سينين' },
  { label: 'شوجو', slug: 'شوجو' },
  { label: 'شريحة من الحياة', slug: 'شريحة-من-الحياة' },
  { label: 'رياضي', slug: 'رياضي' },
  { label: 'مدرسي', slug: 'مدرسي' },
  { label: 'تاريخي', slug: 'تاريخي' },
  { label: 'حربي', slug: 'حربي' },
  { label: 'ميكا', slug: 'ميكا' },
  { label: 'رعب', slug: 'رعب' },
  { label: 'بوليسي', slug: 'بوليسي' },
]

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  
  useSEO({ 
    title: query ? `نتائج البحث: ${query}` : 'استكشاف الأنمي', 
    description: `ابحث عن الأنمي المفضل لديك واستكشف التصنيفات المختلفة على LunarAnime.`
  })
  
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTags, setActiveTags] = useState(searchParams.get('genre') ? searchParams.get('genre').split(',') : [])


  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Synchronize URL changes to perform the search
  useEffect(() => {
    const q = searchParams.get('q')
    const genre = searchParams.get('genre')
    
    setPage(1)
    setHasMore(true)
    
    if (q) {
      if (q !== query) setQuery(q)
      performSearch(q, 1)
      setActiveTags([])
    } else if (genre) {
      const tags = genre.split(',')
      setActiveTags(tags)
      loadGenresData(genre, 1)
    } else {
      loadPopular(1)
      setActiveTags([])
    }
    // eslint-disable-next-line
  }, [searchParams.get('q'), searchParams.get('genre')])

  // Keep searchParams in sync with query input (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (query.trim() !== currentQ.trim()) {
        const params = {}
        if (query.trim()) params.q = query.trim()
        setSearchParams(params)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [query, setSearchParams, searchParams])

  // Merge new results with existing ones, removing duplicates by ID
  const mergeResults = (prev, incoming) => {
    const seen = new Set(prev.map(r => r.id))
    const unique = incoming.filter(r => !seen.has(r.id))
    return { merged: [...prev, ...unique], newCount: unique.length }
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    if (query) {
      performSearch(query, next, true)
    } else if (activeTags.length > 0) {
      loadGenresData(activeTags.join(','), next, true)
    } else {
      loadPopular(next, true)
    }
  }

  const performSearch = async (q, pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const data = await searchMulti(q, pageNum)
      if (append) {
        setResults(prev => {
          const { merged, newCount } = mergeResults(prev, Array.isArray(data) ? data : [])
          if (newCount === 0) setHasMore(false)
          return merged
        })
      } else {
        const resultsArray = Array.isArray(data) ? data : []
        setResults(resultsArray)
        setHasMore(resultsArray.length > 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadPopular = async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const data = await getPopular(pageNum)
      if (append) {
        setResults(prev => {
          const { merged, newCount } = mergeResults(prev, Array.isArray(data) ? data : [])
          if (newCount === 0) setHasMore(false)
          return merged
        })
      } else {
        const resultsArray = Array.isArray(data) ? data : []
        setResults(resultsArray)
        setHasMore(resultsArray.length > 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadGenresData = async (genreSlug, pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const data = await discoverByGenre('anime', genreSlug, pageNum)
      if (append) {
        setResults(prev => {
          const { merged, newCount } = mergeResults(prev, Array.isArray(data) ? data : [])
          if (newCount === 0) setHasMore(false)
          return merged
        })
      } else {
        const resultsArray = Array.isArray(data) ? data : []
        setResults(resultsArray)
        setHasMore(resultsArray.length > 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  const handleTagClick = (tag) => {
    setQuery('')
    let newTags = []
    if (activeTags.includes(tag.slug)) {
      newTags = activeTags.filter(t => t !== tag.slug)
    } else {
      newTags = [...activeTags, tag.slug]
    }
    
    if (newTags.length === 0) {
      setSearchParams({})
    } else {
      setSearchParams({ genre: newTags.join(',') })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query.trim() })
      setPage(1)
    }
  }

  return (
    <div className="search-page page-enter container" style={{ direction: 'rtl', textAlign: 'right' }}>
      <div className="search-page__header" style={{ textAlign: 'right' }}>
        <h1 style={{ fontWeight: 800 }}>اكتشف الآن</h1>
        <p className="search-page__subtitle" style={{ color: 'var(--text-muted)' }}>ابحث عن الأنميات المفضلة لديك واستكشف التصنيفات</p>
      </div>

      <form className="search-page__bar glass" onSubmit={handleSubmit} style={{ flexDirection: 'row-reverse' }}>
        <SearchIcon size={20} className="search-page__bar-icon" style={{ marginLeft: '12px', marginRight: 0 }} />
        <input
          type="text"
          placeholder="ابحث عن اسم الأنمي..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-page__bar-input"
          style={{ textAlign: 'right' }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem', marginRight: 'auto', marginLeft: 0 }}>
          بحث
        </button>
      </form>

      {/* Mood Tags */}
      <div className="search-page__tags" style={{ flexDirection: 'row-reverse' }}>
        <SlidersHorizontal size={16} className="search-page__tags-icon" style={{ marginLeft: '12px', marginRight: 0 }} />
        <div className="search-page__tags-list" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          {MOOD_TAGS.map(tag => (
            <button
              key={tag.label}
              className={`search-page__tag ${activeTags.includes(tag.slug) ? 'active' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ad Banner */}
      {ADS_CONFIG.ENABLED && ADS_CONFIG.placements.searchBanner && <AdSlot type="banner" />}

      {/* Results */}
      <div className="search-page__results">
        {loading && page === 1 ? (
          <div className="search-page__grid">
            {Array(12).fill(0).map((_, i) => <MovieCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="search-page__empty" style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>لا توجد نتائج. جرب البحث عن شيء آخر أو تغيير التصنيف.</p>
          </div>
        ) : (
          <>
            <div className="search-page__grid">
              {results.map((item, i) => (
                <MovieCard
                  key={`${item.id}-${i}`}
                  item={item}
                  mediaType="anime"
                />
              ))}
            </div>
            
            {hasMore && (
               <div style={{ textAlign: 'center', marginTop: '40px' }}>
                 <button 
                   className="btn-secondary" 
                   onClick={handleLoadMore}
                   disabled={loading}
                   style={{ padding: '12px 32px' }}
                 >
                   {loading ? 'جاري التحميل...' : 'عرض المزيد'}
                 </button>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

