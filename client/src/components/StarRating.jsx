import { useState } from 'react'
import { Star } from 'lucide-react'
import './StarRating.css'

export default function StarRating({ value = 0, onChange, readonly = false, size = 24 }) {
  const [hoverValue, setHoverValue] = useState(0)
  const displayValue = hoverValue || value

  const handleClick = (newValue) => {
    if (readonly) return
    onChange?.(newValue)
  }

  return (
    <div className={`star-rating ${readonly ? 'star-rating--readonly' : ''}`}>
      <div className="star-rating__stars">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
          const half = i - 0.5
          const isFilled = displayValue >= i
          const isHalf = displayValue >= half && displayValue < i

          return (
            <button
              key={i}
              className={`star-rating__star ${isFilled ? 'filled' : ''} ${isHalf ? 'half' : ''}`}
              onClick={() => handleClick(i)}
              onMouseEnter={() => !readonly && setHoverValue(i)}
              onMouseLeave={() => !readonly && setHoverValue(0)}
              disabled={readonly}
              type="button"
            >
              <Star
                size={size}
                fill={isFilled ? '#fbbf24' : 'none'}
                stroke={isFilled || isHalf ? '#fbbf24' : '#4b5563'}
                strokeWidth={1.5}
              />
            </button>
          )
        })}
      </div>
      <span className="star-rating__value">
        {displayValue > 0 ? `${displayValue}/10` : 'Rate this'}
      </span>
    </div>
  )
}
