import { type NextRequest, NextResponse } from "next/server"
import { fetchTrendingContent } from "@/lib/movie-api"

/**
 * GET /api/content/trending
 * Fetches trending movies and TV shows
 * Query params:
 * - timeWindow: 'day' | 'week' (default: 'week')
 * - page: number (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const timeWindow = (searchParams.get("timeWindow") as "day" | "week") || "week"
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Validate parameters
    if (!["day", "week"].includes(timeWindow)) {
      return NextResponse.json({ success: false, error: "Invalid timeWindow parameter" }, { status: 400 })
    }

    if (page < 1 || page > 100) {
      return NextResponse.json({ success: false, error: "Page must be between 1 and 100" }, { status: 400 })
    }

    // Fetch trending content
    const result = await fetchTrendingContent(timeWindow, page)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    // Return successful response with caching headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Trending API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
