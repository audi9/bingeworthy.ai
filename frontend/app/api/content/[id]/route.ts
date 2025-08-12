import { type NextRequest, NextResponse } from "next/server"
import { fetchContentDetails } from "@/lib/movie-api"

/**
 * GET /api/content/[id]
 * Fetches detailed information for a specific movie or TV show
 * Query params:
 * - type: 'movie' | 'tv' (required)
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Extract and validate ID
    const id = Number.parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid content ID" }, { status: 400 })
    }

    // Extract and validate type
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as "movie" | "tv"

    if (!type || !["movie", "tv"].includes(type)) {
      return NextResponse.json({ success: false, error: "Content type (movie or tv) is required" }, { status: 400 })
    }

    // Fetch content details
    const result = await fetchContentDetails(id, type)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Content not found" ? 404 : 500 },
      )
    }

    // Return detailed content with longer caching
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400", // Cache for 2 hours
      },
    })
  } catch (error) {
    console.error("Content details API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
