import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import './EpisodeBrowser.css'

const CHUNK_SIZE = 50

export default function EpisodeBrowser({ episodes, currentEpisode, watchedEpisodes = [], onSelect }) {
  const [jumpInput, setJumpInput] = useState('')
  
  // ... (rest of the component logic)

  // Memoize check to avoid recalculating during renders
  const isWatched = (epNum) => watchedEpisodes.includes(epNum)

  // Build range chunks: 1-50, 51-100, etc.
  const ranges = useMemo(() => {
    if (!episodes || episodes.length === 0) return []

    const minEp = episodes[0].episodeNumber
    const maxEp = episodes[episodes.length - 1].episodeNumber

    // Calculate the start of the first range (floor to nearest CHUNK_SIZE boundary)
    const rangeStart = Math.floor((minEp - 1) / CHUNK_SIZE) * CHUNK_SIZE + 1
    const chunks = []

    for (let start = rangeStart; start <= maxEp; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE - 1
      const rangeEps = episodes.filter(
        ep => ep.episodeNumber >= start && ep.episodeNumber <= end
      )
      if (rangeEps.length > 0) {
        chunks.push({ start, end: Math.min(end, maxEp), episodes: rangeEps })
      }
    }

    return chunks
  }, [episodes])

  // Auto-select the range that contains the current episode
  const activeRangeIndex = useMemo(() => {
    const idx = ranges.findIndex(
      r => currentEpisode >= r.start && currentEpisode <= r.end
    )
    return idx >= 0 ? idx : 0
  }, [ranges, currentEpisode])

  const [selectedRange, setSelectedRange] = useState(activeRangeIndex)

  // Sync selected range when the activeRangeIndex changes (e.g., next/prev episode crosses a boundary)
  useMemo(() => {
    setSelectedRange(activeRangeIndex)
  }, [activeRangeIndex])

  const currentRange = ranges[selectedRange] || ranges[0]

  const handleJump = (e) => {
    e.preventDefault()
    const num = parseInt(jumpInput, 10)
    if (!num) return
    const target = episodes.find(ep => ep.episodeNumber === num)
    if (target) {
      onSelect(target.episodeNumber)
      setJumpInput('')
    }
  }

  if (!episodes || episodes.length === 0) return null

  // For short anime (< CHUNK_SIZE eps), skip the range tabs entirely
  const showRanges = ranges.length > 1

  return (
    <div className="ep-browser">
      {/* Header row: title + jump-to input */}
      <div className="ep-browser__header">
        <span className="ep-browser__title">
          الحلقات ({episodes.length})
        </span>
        <form className="ep-browser__jump" onSubmit={handleJump}>
          <input
            type="number"
            placeholder="رقم الحلقة..."
            value={jumpInput}
            onChange={e => setJumpInput(e.target.value)}
            min={episodes[0]?.episodeNumber}
            max={episodes[episodes.length - 1]?.episodeNumber}
            className="ep-browser__jump-input"
          />
          <button type="submit" className="ep-browser__jump-btn" aria-label="انتقل">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Range Tabs */}
      {showRanges && (
        <div className="ep-browser__ranges">
          {ranges.map((r, i) => (
            <button
              key={r.start}
              className={`ep-browser__range-btn ${i === selectedRange ? 'active' : ''}`}
              onClick={() => setSelectedRange(i)}
            >
              {r.start}-{r.end}
            </button>
          ))}
        </div>
      )}

      {/* Episode Grid */}
      {currentRange && (
        <div className="ep-browser__grid">
          {currentRange.episodes.map(ep => (
            <button
              key={ep.episodeNumber}
              className={`ep-browser__ep-btn ${currentEpisode === ep.episodeNumber ? 'active' : ''} ${watchedEpisodes.includes(ep.episodeNumber) ? 'watched' : ''}`}
              onClick={() => onSelect(ep.episodeNumber)}
            >
              {ep.episodeNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
