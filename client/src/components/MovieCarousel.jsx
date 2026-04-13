import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MovieCard, { MovieCardSkeleton } from './MovieCard'
import './MovieCarousel.css'

export default function MovieCarousel({ title, items, loading, mediaType, viewAllLink, onRemove }) {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -600 : 600
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="carousel-section">
      <div className="container">
        <div className="section-title">
          <h2>{title}</h2>
          {viewAllLink && (
            <a href={viewAllLink} className="view-all">View All →</a>
          )}
        </div>
      </div>
      <div className="carousel-wrapper">
        <button className="carousel-arrow carousel-arrow--left" onClick={() => scroll('left')}>
          <ChevronLeft size={22} />
        </button>
        <div className="carousel-scroll" ref={scrollRef}>
          <div className="carousel-track">
            {loading
              ? Array(8).fill(0).map((_, i) => <MovieCardSkeleton key={i} />)
              : items?.map((item, idx) => (
                  <MovieCard key={`${item.id}-${idx}`} item={item} mediaType={mediaType} onRemove={onRemove} />
                ))
            }
          </div>
        </div>
        <button className="carousel-arrow carousel-arrow--right" onClick={() => scroll('right')}>
          <ChevronRight size={22} />
        </button>
      </div>
    </section>
  )
}
