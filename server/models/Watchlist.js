const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  animeId: { type: String, required: true },
  mediaType: { type: String, default: 'anime' },
  title: { type: String, required: true },
  posterPath: { type: String },
  backdropPath: { type: String },
  voteAverage: { type: Number },
  releaseDate: { type: String },
  order: { type: Number, default: 0 },
  watched: { type: Boolean, default: false },
  lastSeason: { type: Number },
  lastEpisode: { type: Number },
  watchedEpisodesList: { type: [Number], default: [] },
  addedAt: { type: Date, default: Date.now }
});

watchlistItemSchema.index({ animeId: 1 });

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [watchlistItemSchema]
});

watchlistSchema.index({ userId: 1 });

module.exports = mongoose.model('Watchlist', watchlistSchema);
