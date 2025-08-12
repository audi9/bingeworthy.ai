// Main content interface for movies and TV shows
export interface Content {
  id: number
  title: string
  type: "movie" | "tv"
  description: string
  release_year: number
  poster_url: string
  backdrop_url?: string
  imdb_rating: number
  rotten_tomatoes_rating?: number
  tmdb_rating: number
  genre: string
  streaming_platforms: string[]
  cast: string[]
  runtime: number
  country: string
  language: string
  trailer_url?: string
  status: "released" | "upcoming" | "in_production"
}

// TMDB API response interfaces
export interface TMDBMovie {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  genre_ids: number[]
  adult: boolean
  original_language: string
  runtime?: number
  status?: string
}

export interface TMDBTVShow {
  id: number
  name: string
  overview: string
  first_air_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  genre_ids: number[]
  origin_country: string[]
  original_language: string
  episode_run_time?: number[]
  status?: string
}

// Genre mapping for TMDB
export interface TMDBGenre {
  id: number
  name: string
}

// Search filters interface
export interface SearchFilters {
  platform: string
  genre: string
  language: string
  country: string
  type: string
  year?: number
  rating_min?: number
}

// API response wrapper
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
}

// Streaming platform data
export interface StreamingPlatform {
  id: string
  name: string
  logo_url: string
  base_url: string
}
