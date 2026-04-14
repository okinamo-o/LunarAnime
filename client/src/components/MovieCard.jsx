import { Link, useNavigate } from 'react-router-dom'
import { Play, X } from 'lucide-react'
import { getImageUrl } from '../api/animeClient'
import './MovieCard.css'

export default function MovieCard({ item, onRemove }) {
  const navigate = useNavigate()
  const title = item.title || item.name
  const bottomLabel = item.releaseDate || '' 

  const handleCardClick = () => {
    navigate(`/anime/${item.id}`)
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    if (onRemove) onRemove(item.id)
  }

  return (
    <div className="movie-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="movie-card__poster-wrapper">
        <img
          src={getImageUrl(item.poster || item.posterPath)}
          alt={title}
          className="movie-card__poster"
          loading="lazy"
        />
        <div className="movie-card__overlay">
          <Link
            to={`/watch/anime/${item.id}`}
            className="movie-card__play-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <Play size={24} fill="white" />
          </Link>
          
          {onRemove && (
            <button 
              className="movie-card__remove-btn" 
              onClick={handleRemove}
              title="إزالة من القائمة"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {item.animeType && (
          <div className="movie-card__badges">
            <span className={`movie-card__badge movie-card__badge--type ${(item.animeType || '').toLowerCase()}`}>
              {item.animeType}
            </span>
          </div>
        )}
      </div>
      <div className="movie-card__info">
        <h3 className="movie-card__title">{title}</h3>
        <span className="movie-card__year">{bottomLabel}</span>
      </div>
    </div>
  )
}

export function MovieCardSkeleton() {
  return (
    <div className="movie-card movie-card--skeleton">
      <div className="movie-card__poster-wrapper skeleton" style={{ aspectRatio: '2/3' }} />
      <div className="movie-card__info">
        <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '40%', height: 12 }} />
      </div>
    </div>
  )
}
