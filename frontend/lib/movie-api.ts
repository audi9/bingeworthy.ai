import type { Content, TMDBMovie, TMDBTVShow, APIResponse, SearchFilters } from "./types"

// TMDB API configuration - Free API with 1000 requests per day
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

// You can get your free TMDB API key from: https://www.themoviedb.org/settings/api
// Free tier: 1000 requests per day, no expiration
const TMDB_API_KEY = process.env.TMDB_API_KEY || "your_tmdb_api_key_here"

// Genre mapping from TMDB IDs to names
const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
}

// Streaming platform detection based on content metadata
const STREAMING_PLATFORMS = [
  "Netflix",
  "HBO Max",
  "Amazon Prime",
  "Disney+",
  "Apple TV+",
  "Paramount+",
  "Hulu",
  "Peacock",
  "Zee5",
  "Hotstar",
]

/**
 * Fetches trending movies and TV shows from TMDB
 * @param timeWindow - 'day' or 'week' for trending period
 * @param page - Page number for pagination (default: 1)
 * @returns Promise with trending content
 */
export async function fetchTrendingContent(
  timeWindow: "day" | "week" = "week",
  page = 1,
): Promise<APIResponse<Content[]>> {
  try {
    // Fetch trending movies and TV shows separately
    const [moviesResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}&page=${page}`),
      fetch(`${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${TMDB_API_KEY}&page=${page}`),
    ])

    if (!moviesResponse.ok || !tvResponse.ok) {
      throw new Error("Failed to fetch trending content")
    }

    const moviesData = await moviesResponse.json()
    const tvData = await tvResponse.json()

    // Convert TMDB data to our Content interface
    const movies: Content[] = moviesData.results.map((movie: TMDBMovie) => convertTMDBMovieToContent(movie))

    const tvShows: Content[] = tvData.results.map((show: TMDBTVShow) => convertTMDBTVToContent(show))

    // Combine and sort by rating
    const allContent = [...movies, ...tvShows].sort((a, b) => b.tmdb_rating - a.tmdb_rating)

    return {
      success: true,
      data: allContent.slice(0, 20), // Return top 20 items
    }
  } catch (error) {
    console.error("Error fetching trending content:", error)
    return {
      success: false,
      error: "Failed to fetch trending content",
    }
  }
}

/**
 * Searches for movies and TV shows based on query
 * @param query - Search term
 * @param filters - Additional search filters
 * @returns Promise with search results
 */
export async function searchContent(query: string, filters?: SearchFilters): Promise<APIResponse<Content[]>> {
  try {
    if (!TMDB_API_KEY || TMDB_API_KEY === "your_tmdb_api_key_here") {
      console.error("TMDB API key is not configured. Please add TMDB_API_KEY to your environment variables.")
      return {
        success: false,
        data: [],
        error:
          "TMDB API key is required. Please configure TMDB_API_KEY in your environment variables to enable search functionality.",
      }
    }

    console.log(`🔍 Searching for: "${query}" with filters:`, filters)

    const searchPromises = []

    // Search movies (2 pages)
    searchPromises.push(searchMovies(query, filters, 1))
    searchPromises.push(searchMovies(query, filters, 2))

    // Search TV shows (2 pages)
    searchPromises.push(searchTVShows(query, filters, 1))
    searchPromises.push(searchTVShows(query, filters, 2))

    const results = await Promise.allSettled(searchPromises)

    const allResults: Content[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        allResults.push(...(result.value.data || []))
        console.log(`✅ Search ${index + 1} returned ${result.value.data?.length || 0} results`)
      } else {
        console.warn(
          `❌ Search ${index + 1} failed:`,
          result.status === "rejected" ? result.reason : result.value.error,
        )
      }
    })

    console.log(`📊 Found ${allResults.length} total results before filtering`)

    const uniqueResults = allResults.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id && t.type === item.type),
    )

    console.log(`🔄 ${uniqueResults.length} unique results after deduplication`)

    // Apply additional filters with more lenient matching
    let filteredResults = uniqueResults
    if (filters) {
      filteredResults = applyFilters(uniqueResults, filters)
      console.log(`🎯 ${filteredResults.length} results after applying filters`)
    }

    filteredResults.sort((a, b) => {
      const relevanceA = calculateRelevanceScore(a, query)
      const relevanceB = calculateRelevanceScore(b, query)

      // Combine relevance with ratings (relevance is more important)
      const scoreA = relevanceA * 3 + a.tmdb_rating + a.imdb_rating * 0.5
      const scoreB = relevanceB * 3 + b.tmdb_rating + b.imdb_rating * 0.5

      return scoreB - scoreA
    })

    // Return top results
    const finalResults = filteredResults.slice(0, 50)
    console.log(`🎬 Returning ${finalResults.length} final results`)

    return {
      success: true,
      data: finalResults,
      message:
        finalResults.length > 0
          ? `Found ${finalResults.length} results for "${query}"`
          : `No results found for "${query}". Try different keywords or check your filters.`,
    }
  } catch (error) {
    console.error("❌ Search error:", error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Search failed due to an unexpected error",
    }
  }
}

/**
 * Searches for movies using TMDB API with pagination
 */
async function searchMovies(query: string, filters?: SearchFilters, page = 1): Promise<APIResponse<Content[]>> {
  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Movie search failed for page ${page}:`, response.status, response.statusText)
      return { success: false, error: `API request failed: ${response.status}` }
    }

    const data = await response.json()
    console.log(`Found ${data.results?.length || 0} movies on page ${page}`)

    const movies = (data.results || []).map((movie: TMDBMovie) => convertTMDBMovieToContent(movie))

    return { success: true, data: movies }
  } catch (error) {
    console.error(`Error searching movies page ${page}:`, error)
    return { success: false, error: "Movie search failed" }
  }
}

/**
 * Searches for TV shows using TMDB API with pagination
 */
async function searchTVShows(query: string, filters?: SearchFilters, page = 1): Promise<APIResponse<Content[]>> {
  try {
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`TV search failed for page ${page}:`, response.status, response.statusText)
      return { success: false, error: `API request failed: ${response.status}` }
    }

    const data = await response.json()
    console.log(`Found ${data.results?.length || 0} TV shows on page ${page}`)

    const tvShows = (data.results || []).map((show: TMDBTVShow) => convertTMDBTVToContent(show))

    return { success: true, data: tvShows }
  } catch (error) {
    console.error(`Error searching TV shows page ${page}:`, error)
    return { success: false, error: "TV search failed" }
  }
}

/**
 * Converts TMDB movie data to our Content interface
 */
function convertTMDBMovieToContent(movie: TMDBMovie): Content {
  return {
    id: movie.id,
    title: movie.title,
    type: "movie",
    description: movie.overview || "No description available",
    release_year: new Date(movie.release_date || "2024").getFullYear(),
    poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : "/abstract-movie-poster.png",
    backdrop_url: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}` : undefined,
    imdb_rating: Math.round(movie.vote_average * 10) / 10,
    tmdb_rating: movie.vote_average,
    genre:
      movie.genre_ids
        .map((id) => GENRE_MAP[id])
        .filter(Boolean)
        .join(", ") || "Unknown",
    streaming_platforms: [],
    cast: [],
    runtime: movie.runtime || 120,
    country: "US",
    language: movie.original_language.toUpperCase(),
    status: (movie.status as any) || "released",
  }
}

/**
 * Converts TMDB TV show data to our Content interface
 */
function convertTMDBTVToContent(show: TMDBTVShow): Content {
  return {
    id: show.id,
    title: show.name,
    type: "tv",
    description: show.overview || "No description available",
    release_year: new Date(show.first_air_date || "2024").getFullYear(),
    poster_url: show.poster_path ? `${TMDB_IMAGE_BASE_URL}${show.poster_path}` : "/mystery-town-poster.png",
    backdrop_url: show.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${show.backdrop_path}` : undefined,
    imdb_rating: Math.round(show.vote_average * 10) / 10,
    tmdb_rating: show.vote_average,
    genre:
      show.genre_ids
        .map((id) => GENRE_MAP[id])
        .filter(Boolean)
        .join(", ") || "Unknown",
    streaming_platforms: [],
    cast: [],
    runtime: show.episode_run_time?.[0] || 45,
    country: show.origin_country[0] || "US",
    language: show.original_language.toUpperCase(),
    status: (show.status as any) || "released",
  }
}

/**
 * Fetches detailed information for a specific movie or TV show
 * @param id - TMDB ID
 * @param type - 'movie' or 'tv'
 */
export async function fetchContentDetails(id: number, type: "movie" | "tv"): Promise<APIResponse<Content>> {
  try {
    const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`
    const response = await fetch(url)

    if (!response.ok) throw new Error("Failed to fetch content details")

    const data = await response.json()

    // Convert to our Content interface with additional details
    const content: Content = type === "movie" ? convertTMDBMovieToContent(data) : convertTMDBTVToContent(data)

    // Add cast information from credits
    if (data.credits?.cast) {
      content.cast = data.credits.cast.slice(0, 5).map((actor: any) => actor.name)
    }

    // Add trailer URL from videos
    if (data.videos?.results) {
      const trailer = data.videos.results.find((video: any) => video.type === "Trailer" && video.site === "YouTube")
      if (trailer) {
        content.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`
      }
    }

    return {
      success: true,
      data: content,
    }
  } catch (error) {
    console.error("Error fetching content details:", error)
    return {
      success: false,
      error: "Failed to fetch content details",
    }
  }
}

/**
 * Fetches trending movies and TV shows from TMDB
 * @returns Promise with trending content
 */
export async function getTrendingContent(): Promise<APIResponse<Content[]>> {
  try {
    if (!TMDB_API_KEY || TMDB_API_KEY === "your_tmdb_api_key_here") {
      console.error("TMDB API key is not configured for trending content")
      return {
        success: false,
        data: [],
        error: "TMDB API key is required. Please configure TMDB_API_KEY in your environment variables.",
      }
    }

    console.log("🔥 Fetching trending content...")

    // Fetch trending movies and TV shows separately
    const [movieResults, tvResults] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`),
    ])

    if (!movieResults.ok || !tvResults.ok) {
      throw new Error(`API request failed: Movies ${movieResults.status}, TV ${tvResults.status}`)
    }

    const moviesData = await movieResults.json()
    const tvData = await tvResults.json()

    // Convert TMDB data to our Content interface
    const movies: Content[] = moviesData.results.map((movie: TMDBMovie) => convertTMDBMovieToContent(movie))
    const tvShows: Content[] = tvData.results.map((show: TMDBTVShow) => convertTMDBTVToContent(show))

    // Combine and sort by rating
    const combinedResults = [...movies, ...tvShows].sort((a, b) => b.tmdb_rating - a.tmdb_rating)

    console.log(`✅ Successfully fetched ${combinedResults.length} trending items`)

    return {
      success: true,
      data: combinedResults.slice(0, 100),
      message: "Successfully fetched trending content",
    }
  } catch (error) {
    console.error("❌ Trending content error:", error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch trending content",
    }
  }
}

/**
 * Applies search filters to content array with more lenient matching
 */
function applyFilters(content: Content[], filters: SearchFilters): Content[] {
  return content.filter((item) => {
    // Filter by type (movie/tv)
    if (filters.type && item.type !== filters.type) return false

    if (filters.genre) {
      const filterGenre = filters.genre.toLowerCase()
      const itemGenres = item.genre.toLowerCase()
      if (!itemGenres.includes(filterGenre)) return false
    }

    // Filter by language
    if (filters.language && item.language !== filters.language.toUpperCase()) return false

    // Filter by country
    if (filters.country && item.country !== filters.country.toUpperCase()) return false

    if (filters.platform) {
      const filterPlatform = filters.platform.toLowerCase()
      const hasMatchingPlatform = item.streaming_platforms.some(
        (p) => p.toLowerCase().includes(filterPlatform) || filterPlatform.includes(p.toLowerCase()),
      )
      if (!hasMatchingPlatform) return false
    }

    // Filter by minimum rating - but be more lenient
    if (filters.rating_min && item.tmdb_rating < filters.rating_min - 0.5) return false

    // Filter by year - allow +/- 1 year tolerance
    if (filters.year && Math.abs(item.release_year - filters.year) > 1) return false

    return true
  })
}

/**
 * Calculate relevance score based on query match in title and description
 */
function calculateRelevanceScore(content: Content, query: string): number {
  const queryLower = query.toLowerCase()
  const titleLower = content.title.toLowerCase()
  const descriptionLower = content.description.toLowerCase()
  const genreLower = content.genre.toLowerCase()

  let score = 0

  // Exact title match gets highest score
  if (titleLower === queryLower) score += 10
  // Title contains query
  else if (titleLower.includes(queryLower)) score += 5

  // Description contains query
  if (descriptionLower.includes(queryLower)) score += 3

  // Genre matches
  if (genreLower.includes(queryLower)) score += 2

  // Partial word matches in title
  const queryWords = queryLower.split(" ")
  const titleWords = titleLower.split(" ")

  queryWords.forEach((queryWord) => {
    if (queryWord.length > 2) {
      // Skip very short words
      titleWords.forEach((titleWord) => {
        if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) {
          score += 1
        }
      })
    }
  })

  return score
}
