import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTrending, getImageUrl } from '../api/animeClient'
import './Hero.css'

export default function Hero() {
  const [movies, setMovies] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const trendData = await getTrending()
        const filtered = (Array.isArray(trendData) ? trendData : []).filter(m => m.poster).slice(0, 6)
        setMovies(filtered)
      } catch (err) {
        console.error('Failed to load hero:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (movies.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % movies.length)
    }, 8000)
    return () => clearInterval(timerRef.current)
  }, [movies])

  const goTo = (idx) => {
    setCurrentIndex(idx)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % movies.length)
    }, 8000)
  }

  if (loading) {
    return (
      <div className="hero hero--loading">
        <div className="hero__skeleton skeleton" />
      </div>
    )
  }

  const movie = movies[currentIndex]
  if (!movie) return null

  return (
    <section className="hero">
      <div className="hero__backdrop-wrapper">
        {movies.map((m, i) => (
          <div
            key={m.id}
            className={`hero__backdrop ${i === currentIndex ? 'hero__backdrop--active' : ''}`}
          >
            {/* Blurred background layer to fill the screen */}
            <img
              src={getImageUrl(m.poster)}
              alt=""
              className="hero__backdrop-img hero__backdrop-img--blur"
            />
            {/* Sharp foreground layer - 'zoomed out' relative to cover */}
            <img
              src={getImageUrl(m.poster)}
              alt={m.title}
              className="hero__backdrop-img hero__backdrop-img--main"
            />
          </div>
        ))}

        <div className="hero__gradient hero__gradient--bottom" />
        <div className="hero__gradient hero__gradient--left" />
        <div className="hero__vignette" />
      </div>

      <div className="hero__content container" style={{ textAlign: 'right' }}>
        <div className="hero__info animate-fade-up" key={movie.id}>
          <h1 className="hero__title">{movie.title}</h1>

          <div className="hero__badges" style={{ justifyContent: 'flex-end', marginBottom: '24px' }}>
            <span className="badge badge-accent">🔥 الترند</span>
            <span className="badge">{movie.releaseDate}</span>
          </div>

          <div className="hero__actions" style={{ justifyContent: 'flex-end' }}>
            <Link
              to={`/watch/anime/${movie.id}`}
              className="btn-primary hero__play-btn"
              style={{ flexDirection: 'row-reverse', gap: '8px' }}
            >
              شاهد الآن <Play size={18} fill="white" />
            </Link>
            <Link
              to={`/anime/${movie.id}`}
              className="btn-secondary"
            >
              التفاصيل
            </Link>
          </div>
        </div>

        <div className="hero__dots">
          {movies.map((_, i) => (
            <button
              key={i}
              className={`hero__dot ${i === currentIndex ? 'hero__dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`انتقل إلى ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="hero__nav-arrows">
        <button
          className="hero__nav-arrow"
          onClick={() => goTo((currentIndex - 1 + movies.length) % movies.length)}
        >
          <ChevronRight size={24} />
        </button>
        <button
          className="hero__nav-arrow"
          onClick={() => goTo((currentIndex + 1) % movies.length)}
        >
          <ChevronLeft size={24} />
        </button>
      </div>
    </section>
  )
}
