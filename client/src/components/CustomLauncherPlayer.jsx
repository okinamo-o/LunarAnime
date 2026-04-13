import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Loader2 } from 'lucide-react'
import { getSubtitleTrackUrl } from '../api/animeClient'
import './CustomLauncherPlayer.css'

const QUALITY_ORDER = ['1080p', '720p', '480p']

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const toQualityLabel = (height) => {
  if (!height || Number.isNaN(height)) return '720p'
  if (height >= 900) return '1080p'
  if (height >= 600) return '720p'
  return '480p'
}

export default function CustomLauncherPlayer({ streamData, title, autoPlay = true }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const hlsRef = useRef(null)
  const subtitleInputRef = useRef(null)
  const localSubtitleUrlsRef = useRef([])

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isBuffering, setIsBuffering] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState('Auto')
  const [selectedSubtitle, setSelectedSubtitle] = useState('off')
  const [errorMessage, setErrorMessage] = useState('')
  const [customSubtitles, setCustomSubtitles] = useState([])

  const subtitleTracks = streamData?.subtitles || []
  const allSubtitleTracks = [...subtitleTracks, ...customSubtitles]

  const qualityOptions = useMemo(() => {
    if (!streamData?.sources?.length) {
      return [{ label: 'Auto', value: 'Auto', levelIndex: -1, url: streamData?.masterUrl }]
    }

    const sorted = [...streamData.sources].sort((a, b) => (b.height || 0) - (a.height || 0))
    const byLabel = new Map()
    sorted.forEach((source) => {
      const label = source.label || toQualityLabel(source.height)
      if (!byLabel.has(label)) {
        byLabel.set(label, source)
      }
    })

    const closestTo = (targetHeight) => {
      if (!sorted.length) return null
      return sorted.reduce((best, next) => {
        const bestDelta = Math.abs((best.height || targetHeight) - targetHeight)
        const nextDelta = Math.abs((next.height || targetHeight) - targetHeight)
        return nextDelta < bestDelta ? next : best
      }, sorted[0])
    }

    const pickForLabel = (label) => {
      if (byLabel.has(label)) return byLabel.get(label)
      if (label === '1080p') return sorted[0]
      if (label === '720p') return closestTo(720)
      return sorted[sorted.length - 1]
    }

    const fixedLabels = ['1080p', '720p', '480p']
    const fixedOptions = fixedLabels.map((label) => {
      const source = pickForLabel(label)
      return {
        label,
        value: label,
        levelIndex: -1,
        url: source?.url || streamData.masterUrl
      }
    })

    return [{ label: 'Auto', value: 'Auto', levelIndex: -1, url: streamData.masterUrl }, ...fixedOptions]
  }, [streamData])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamData?.masterUrl) return undefined

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      })

      hlsRef.current = hls
      hls.loadSource(streamData.masterUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels || []

        const pickLevelIndex = (label) => {
          if (!levels.length) return -1
          if (label === '1080p') {
            return levels.reduce((best, level, idx, arr) => (
              (level.height || 0) > (arr[best]?.height || 0) ? idx : best
            ), 0)
          }

          if (label === '480p') {
            return levels.reduce((best, level, idx, arr) => (
              (level.height || Number.MAX_SAFE_INTEGER) < (arr[best]?.height || Number.MAX_SAFE_INTEGER) ? idx : best
            ), 0)
          }

          return levels.reduce((best, level, idx, arr) => {
            const bestHeight = arr[best]?.height || 720
            const nextHeight = level.height || 720
            return Math.abs(nextHeight - 720) < Math.abs(bestHeight - 720) ? idx : best
          }, 0)
        }

        const mappedOptions = qualityOptions.map((opt) => {
          if (opt.value === 'Auto') return opt
          return {
            ...opt,
            levelIndex: pickLevelIndex(opt.value)
          }
        })

        if (mappedOptions.length > 0) {
          const preferred = mappedOptions.find((opt) => opt.value === '1080p')
            || mappedOptions.find((opt) => opt.value === '720p')
            || mappedOptions.find((opt) => opt.value === '480p')
            || mappedOptions[0]

          if (preferred?.value && preferred.value !== 'Auto' && preferred.levelIndex >= 0) {
            hls.currentLevel = preferred.levelIndex
            setSelectedQuality(preferred.value)
          } else {
            hls.currentLevel = -1
            setSelectedQuality('Auto')
          }
        }

        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay can fail due to browser policy; user can start manually.
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setErrorMessage('Custom stream failed to load. Switch to fallback server mode.')
          setIsBuffering(false)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamData.masterUrl
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay can fail due to browser policy; user can start manually.
        })
      }
    } else {
      window.setTimeout(() => {
        setErrorMessage('Your browser does not support this custom stream mode.')
        setIsBuffering(false)
      }, 0)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamData, autoPlay, qualityOptions])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    Array.from(video.textTracks).forEach((track, index) => {
      track.mode = selectedSubtitle === String(index) ? 'showing' : 'disabled'
    })
  }, [selectedSubtitle, allSubtitleTracks.length])

  useEffect(() => {
    return () => {
      localSubtitleUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      localSubtitleUrlsRef.current = []
    }
  }, [])

  const convertSrtToVtt = (text) => {
    const normalized = text.replace(/^\uFEFF/, '').replace(/\r+/g, '')
    const converted = normalized.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      '$1.$2 --> $3.$4'
    )
    return converted.trimStart().startsWith('WEBVTT') ? converted : `WEBVTT\n\n${converted}`
  }

  const handleSubtitleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.srt') && !lowerName.endsWith('.vtt')) {
      setErrorMessage('Unsupported subtitle file. Please upload .srt or .vtt.')
      return
    }

    try {
      const text = await file.text()
      const vttText = lowerName.endsWith('.srt') ? convertSrtToVtt(text) : text
      const blob = new Blob([vttText], { type: 'text/vtt' })
      const objectUrl = URL.createObjectURL(blob)
      localSubtitleUrlsRef.current.push(objectUrl)

      setCustomSubtitles((prev) => [
        ...prev,
        {
          label: file.name.replace(/\.(srt|vtt)$/i, ''),
          lang: 'en',
          url: objectUrl
        }
      ])
      setErrorMessage('')
    } catch {
      setErrorMessage('Failed to load subtitle file.')
    } finally {
      if (subtitleInputRef.current) {
        subtitleInputRef.current.value = ''
      }
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch(() => {
        setErrorMessage('Playback was blocked by the browser.')
      })
      return
    }
    video.pause()
  }

  const handleSeek = (nextProgress) => {
    const video = videoRef.current
    if (!video || !duration) return
    video.currentTime = (nextProgress / 100) * duration
  }

  const handleVolume = (nextVolume) => {
    const video = videoRef.current
    if (!video) return

    const parsed = Math.max(0, Math.min(1, Number(nextVolume)))
    video.volume = parsed
    video.muted = parsed === 0
    setVolume(parsed)
    setIsMuted(parsed === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleQuality = async (value) => {
    const video = videoRef.current
    if (!video) return

    setSelectedQuality(value)
    const currentOption = qualityOptions.find((option) => option.value === value)
    if (!currentOption) return

    if (hlsRef.current) {
      hlsRef.current.currentLevel = value === 'Auto' ? -1 : currentOption.levelIndex
      return
    }

    // Native HLS fallback: switch by source URL when available.
    if (!currentOption.url) return
    const wasPlaying = !video.paused
    const checkpoint = video.currentTime
    video.src = currentOption.url
    video.currentTime = checkpoint
    if (wasPlaying) {
      try {
        await video.play()
      } catch {
        setErrorMessage('Playback was interrupted while switching quality.')
      }
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await containerRef.current.requestFullscreen()
  }

  return (
    <div className="custom-launcher" ref={containerRef}>
      <video
        ref={videoRef}
        className="custom-launcher__video"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0)
          setIsBuffering(false)
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime || 0
          const total = event.currentTarget.duration || 0
          setCurrentTime(nextTime)
          setProgress(total ? (nextTime / total) * 100 : 0)
        }}
      >
        {subtitleTracks.map((subtitle, index) => (
          <track
            key={`${subtitle.url}-${index}`}
            kind="subtitles"
            srcLang={subtitle.lang || 'en'}
            label={subtitle.label || `Subtitle ${index + 1}`}
            src={getSubtitleTrackUrl(subtitle.url)}
          />
        ))}
        {customSubtitles.map((subtitle, index) => (
          <track
            key={`${subtitle.url}-local-${index}`}
            kind="subtitles"
            srcLang={subtitle.lang || 'en'}
            label={subtitle.label || `Local Subtitle ${index + 1}`}
            src={subtitle.url}
          />
        ))}
      </video>

      <div className="custom-launcher__topbar">
        <span className="custom-launcher__chip">Custom Launcher</span>
        <span className="custom-launcher__title">{title}</span>
      </div>

      {isBuffering && (
        <div className="custom-launcher__loader">
          <Loader2 size={26} className="spin" />
          <span>Loading stream...</span>
        </div>
      )}

      {errorMessage && <div className="custom-launcher__error">{errorMessage}</div>}

      <div className="custom-launcher__controls">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="custom-launcher__seek"
          aria-label="Seek"
        />

        <div className="custom-launcher__row">
          <button type="button" className="custom-launcher__icon-btn" onClick={togglePlay} aria-label="Play/Pause">
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <span className="custom-launcher__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button type="button" className="custom-launcher__icon-btn" onClick={toggleMute} aria-label="Mute/Unmute">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(event) => handleVolume(event.target.value)}
            className="custom-launcher__volume"
            aria-label="Volume"
          />

          <label className="custom-launcher__select-wrap">
            <span>Quality</span>
            <select
              value={selectedQuality}
              onChange={(event) => handleQuality(event.target.value)}
              className="custom-launcher__select"
            >
              {qualityOptions.map((quality) => (
                <option key={quality.value} value={quality.value}>
                  {quality.label}
                </option>
              ))}
            </select>
          </label>

          <label className="custom-launcher__select-wrap">
            <span>Subtitles</span>
            <select
              value={selectedSubtitle}
              onChange={(event) => setSelectedSubtitle(event.target.value)}
              className="custom-launcher__select"
            >
              <option value="off">Off</option>
              {allSubtitleTracks.map((subtitle, index) => (
                <option key={`${subtitle.url}-${index}`} value={String(index)}>
                  {subtitle.label || `Subtitle ${index + 1}`}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="custom-launcher__upload-btn"
            onClick={() => subtitleInputRef.current?.click()}
          >
            Upload SRT/VTT
          </button>

          <input
            ref={subtitleInputRef}
            type="file"
            accept=".srt,.vtt,text/vtt,application/x-subrip"
            className="custom-launcher__subtitle-input"
            onChange={handleSubtitleUpload}
          />

          <button
            type="button"
            className="custom-launcher__icon-btn"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
