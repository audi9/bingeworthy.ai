import { type NextRequest, NextResponse } from "next/server"

// Interface for the request body
interface RecommendationRequest {
  query: string
  maxRecommendations?: number
}

// Interface for individual recommendation
interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  confidence: number
}

/**
 * POST /api/ai/recommendations
 * Generates AI-powered content recommendations based on user query
 * Uses free LLM APIs to provide personalized suggestions
 * Now supports "List top X best [genre/type] movies and TV shows" prompts
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: RecommendationRequest = await request.json()
    const { query, maxRecommendations = 6 } = body

    // Validate input
    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Query must be at least 3 characters long",
        },
        { status: 400 },
      )
    }

    const recommendations = await generateAIRecommendations(query.trim(), maxRecommendations)

    return NextResponse.json({
      success: true,
      data: recommendations,
      query: query.trim(),
    })
  } catch (error) {
    console.error("Error generating AI recommendations:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate recommendations",
      },
      { status: 500 },
    )
  }
}

/**
 * Enhanced AI recommendation generator that handles "top X best" prompts
 * Uses real LLM APIs when available, falls back to enhanced mock data
 */
async function generateAIRecommendations(query: string, maxRecommendations: number): Promise<Recommendation[]> {
  const topListPattern =
    /(?:list|show|give me|find)\s+(?:top\s+)?(\d+)?\s*(?:best|top|greatest|most popular)\s+(.+?)(?:movies?|tv shows?|series)/i
  const match = query.match(topListPattern)

  if (match) {
    const requestedCount = match[1] ? Number.parseInt(match[1]) : maxRecommendations
    const category = match[2].trim()

    // Try to use real LLM API first
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        return await generateRealAIRecommendations(query, category, requestedCount)
      } catch (error) {
        console.error("LLM API failed, falling back to enhanced mock:", error)
      }
    }

    // Enhanced mock data for "top X best" queries
    return await generateTopListRecommendations(category, requestedCount)
  }

  // For regular queries, use the existing mock system
  return await generateMockRecommendations(query, maxRecommendations)
}

/**
 * Generate top list recommendations for specific categories
 */
async function generateTopListRecommendations(category: string, count: number): Promise<Recommendation[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const categoryLower = category.toLowerCase()

  const topLists: Record<string, Recommendation[]> = {
    // Action movies and shows
    action: [
      {
        id: "a1",
        title: "Mad Max: Fury Road",
        description: "High-octane post-apocalyptic action masterpiece",
        category: "Action Movie",
        confidence: 0.95,
      },
      {
        id: "a2",
        title: "John Wick",
        description: "Stylish revenge thriller with incredible choreography",
        category: "Action Movie",
        confidence: 0.92,
      },
      {
        id: "a3",
        title: "The Raid",
        description: "Indonesian martial arts action film with brutal intensity",
        category: "Action Movie",
        confidence: 0.9,
      },
      {
        id: "a4",
        title: "Mission: Impossible - Fallout",
        description: "Tom Cruise's most dangerous stunts in this spy thriller",
        category: "Action Movie",
        confidence: 0.89,
      },
      {
        id: "a5",
        title: "Daredevil",
        description: "Netflix's gritty superhero series with amazing fight scenes",
        category: "Action Series",
        confidence: 0.87,
      },
    ],

    // Horror content
    horror: [
      {
        id: "h1",
        title: "Hereditary",
        description: "Psychological horror that redefines family trauma",
        category: "Horror Movie",
        confidence: 0.94,
      },
      {
        id: "h2",
        title: "The Conjuring",
        description: "Classic supernatural horror with perfect atmosphere",
        category: "Horror Movie",
        confidence: 0.91,
      },
      {
        id: "h3",
        title: "Get Out",
        description: "Social thriller that revolutionized horror cinema",
        category: "Horror Movie",
        confidence: 0.93,
      },
      {
        id: "h4",
        title: "The Haunting of Hill House",
        description: "Netflix's masterful horror series about family and ghosts",
        category: "Horror Series",
        confidence: 0.9,
      },
      {
        id: "h5",
        title: "Midsommar",
        description: "Disturbing folk horror set in broad daylight",
        category: "Horror Movie",
        confidence: 0.88,
      },
    ],

    // Comedy content
    comedy: [
      {
        id: "c1",
        title: "The Grand Budapest Hotel",
        description: "Wes Anderson's whimsical comedy masterpiece",
        category: "Comedy Movie",
        confidence: 0.92,
      },
      {
        id: "c2",
        title: "Brooklyn Nine-Nine",
        description: "Perfect workplace comedy with diverse cast",
        category: "Comedy Series",
        confidence: 0.9,
      },
      {
        id: "c3",
        title: "Parasite",
        description: "Dark comedy thriller about class warfare",
        category: "Comedy-Thriller",
        confidence: 0.95,
      },
      {
        id: "c4",
        title: "Schitt's Creek",
        description: "Heartwarming comedy about family and growth",
        category: "Comedy Series",
        confidence: 0.89,
      },
      {
        id: "c5",
        title: "What We Do in the Shadows",
        description: "Vampire mockumentary series that's absolutely hilarious",
        category: "Comedy Series",
        confidence: 0.87,
      },
    ],

    // Drama content
    drama: [
      {
        id: "d1",
        title: "Breaking Bad",
        description: "The ultimate character transformation drama",
        category: "Crime Drama",
        confidence: 0.97,
      },
      {
        id: "d2",
        title: "The Godfather",
        description: "Epic crime saga that defined cinema",
        category: "Drama Movie",
        confidence: 0.96,
      },
      {
        id: "d3",
        title: "Better Call Saul",
        description: "Breaking Bad prequel with incredible character depth",
        category: "Crime Drama",
        confidence: 0.94,
      },
      {
        id: "d4",
        title: "Moonlight",
        description: "Coming-of-age drama with beautiful cinematography",
        category: "Drama Movie",
        confidence: 0.93,
      },
      {
        id: "d5",
        title: "The Crown",
        description: "Royal family drama with stunning production values",
        category: "Historical Drama",
        confidence: 0.91,
      },
    ],

    // Sci-fi content
    "sci-fi": [
      {
        id: "s1",
        title: "Blade Runner 2049",
        description: "Visually stunning cyberpunk masterpiece",
        category: "Sci-Fi Movie",
        confidence: 0.94,
      },
      {
        id: "s2",
        title: "The Expanse",
        description: "Hard science fiction with realistic space politics",
        category: "Sci-Fi Series",
        confidence: 0.92,
      },
      {
        id: "s3",
        title: "Arrival",
        description: "Thoughtful alien contact film about communication",
        category: "Sci-Fi Movie",
        confidence: 0.91,
      },
      {
        id: "s4",
        title: "Black Mirror",
        description: "Anthology series exploring technology's dark side",
        category: "Sci-Fi Series",
        confidence: 0.9,
      },
      {
        id: "s5",
        title: "Dune",
        description: "Epic space opera with incredible world-building",
        category: "Sci-Fi Movie",
        confidence: 0.89,
      },
    ],

    // Netflix originals
    netflix: [
      {
        id: "n1",
        title: "Stranger Things",
        description: "80s nostalgia meets supernatural horror",
        category: "Netflix Original",
        confidence: 0.93,
      },
      {
        id: "n2",
        title: "The Queen's Gambit",
        description: "Chess prodigy's journey through addiction and genius",
        category: "Netflix Original",
        confidence: 0.92,
      },
      {
        id: "n3",
        title: "Ozark",
        description: "Money laundering family drama in the Missouri Ozarks",
        category: "Netflix Original",
        confidence: 0.9,
      },
      {
        id: "n4",
        title: "Mindhunter",
        description: "FBI profilers study serial killers in the 1970s",
        category: "Netflix Original",
        confidence: 0.89,
      },
      {
        id: "n5",
        title: "Dark",
        description: "German time-travel thriller with complex storytelling",
        category: "Netflix Original",
        confidence: 0.88,
      },
    ],
  }

  // Find matching category or use general recommendations
  let recommendations: Recommendation[] = []

  for (const [key, list] of Object.entries(topLists)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      recommendations = list
      break
    }
  }

  // If no specific category found, combine popular items from all categories
  if (recommendations.length === 0) {
    const allRecommendations = Object.values(topLists).flat()
    recommendations = allRecommendations.sort((a, b) => b.confidence - a.confidence)
  }

  // Return requested count, shuffling if we have more than needed
  if (recommendations.length > count) {
    recommendations = recommendations.slice(0, count)
  }

  return recommendations
}

/**
 * Real AI recommendation generator using Hugging Face API
 * Handles "List top X best [category] movies and TV shows" prompts
 */
async function generateRealAIRecommendations(
  query: string,
  category: string,
  count: number,
): Promise<Recommendation[]> {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY

  if (!HF_API_KEY) {
    throw new Error("Hugging Face API key not configured")
  }

  const prompt = `You are a movie and TV show expert. The user asked: "${query}"

Please provide exactly ${count} recommendations for the best ${category} movies and TV shows. For each recommendation, provide:

1. Title (exact name)
2. Brief description (max 80 characters)
3. Category (genre or type)
4. Why it's considered one of the best (confidence reason)

Format your response as a JSON array with this structure:
[
  {
    "title": "Movie/Show Title",
    "description": "Brief description",
    "category": "Genre/Type",
    "confidence": 0.95
  }
]

Focus on critically acclaimed, popular, and influential content. Include both movies and TV shows if the query mentions both.`

  try {
    // Using a more suitable model for text generation
    const response = await fetch("https://api-inference.huggingface.co/models/microsoft/DialoGPT-large", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 1000,
          temperature: 0.3, // Lower temperature for more consistent results
          do_sample: true,
          top_p: 0.9,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`)
    }

    const result = await response.json()

    try {
      // Extract JSON from the response
      const aiText = result[0]?.generated_text || result.generated_text || ""
      const jsonMatch = aiText.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const parsedRecommendations = JSON.parse(jsonMatch[0])

        // Convert to our format and add IDs
        return parsedRecommendations
          .map((rec: any, index: number) => ({
            id: `ai_${Date.now()}_${index}`,
            title: rec.title || `Recommendation ${index + 1}`,
            description: rec.description || "AI-generated recommendation",
            category: rec.category || category,
            confidence: rec.confidence || 0.8,
          }))
          .slice(0, count)
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
    }

    // Fallback if parsing fails
    throw new Error("Could not parse AI response")
  } catch (error) {
    console.error("Hugging Face API error:", error)
    throw error
  }
}

/**
 * Mock AI recommendation generator
 * In production, replace this with actual LLM API calls
 */
async function generateMockRecommendations(query: string, maxRecommendations: number): Promise<Recommendation[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock recommendation database based on common search patterns
  const mockRecommendations: Record<string, Recommendation[]> = {
    // Netflix-related searches
    netflix: [
      {
        id: "1",
        title: "Stranger Things",
        description: "Supernatural thriller series set in the 1980s with great character development",
        category: "Netflix Original",
        confidence: 0.9,
      },
      {
        id: "2",
        title: "The Crown",
        description: "Historical drama about the British Royal Family with excellent production values",
        category: "Netflix Original",
        confidence: 0.85,
      },
    ],

    // HBO-related searches
    hbo: [
      {
        id: "3",
        title: "Game of Thrones",
        description: "Epic fantasy series with complex characters and political intrigue",
        category: "HBO Original",
        confidence: 0.9,
      },
      {
        id: "4",
        title: "The Last of Us",
        description: "Post-apocalyptic drama based on the popular video game",
        category: "HBO Original",
        confidence: 0.88,
      },
    ],

    // Genre-based searches
    "sci-fi": [
      {
        id: "5",
        title: "Blade Runner 2049",
        description: "Visually stunning sequel to the classic cyberpunk film",
        category: "Sci-Fi Movie",
        confidence: 0.92,
      },
      {
        id: "6",
        title: "The Expanse",
        description: "Hard science fiction series with realistic space politics",
        category: "Sci-Fi Series",
        confidence: 0.87,
      },
    ],

    thriller: [
      {
        id: "7",
        title: "Mindhunter",
        description: "Psychological crime series about FBI profilers studying serial killers",
        category: "Crime Thriller",
        confidence: 0.89,
      },
      {
        id: "8",
        title: "Gone Girl",
        description: "Psychological thriller about a missing wife and suspicious husband",
        category: "Psychological Thriller",
        confidence: 0.86,
      },
    ],

    comedy: [
      {
        id: "9",
        title: "The Office",
        description: "Mockumentary sitcom about office workers with great character humor",
        category: "Comedy Series",
        confidence: 0.91,
      },
      {
        id: "10",
        title: "Brooklyn Nine-Nine",
        description: "Police procedural comedy with diverse cast and clever writing",
        category: "Comedy Series",
        confidence: 0.84,
      },
    ],

    // Actor-based searches
    "ryan gosling": [
      {
        id: "11",
        title: "La La Land",
        description: "Musical romantic drama about aspiring artists in Los Angeles",
        category: "Musical Drama",
        confidence: 0.93,
      },
      {
        id: "12",
        title: "Drive",
        description: "Neo-noir action film with stylish cinematography and minimal dialogue",
        category: "Action Thriller",
        confidence: 0.88,
      },
    ],

    // Default recommendations for general searches
    default: [
      {
        id: "13",
        title: "Breaking Bad",
        description: "Crime drama about a chemistry teacher turned methamphetamine manufacturer",
        category: "Crime Drama",
        confidence: 0.95,
      },
      {
        id: "14",
        title: "The Mandalorian",
        description: "Star Wars series following a bounty hunter in the outer rim",
        category: "Sci-Fi Adventure",
        confidence: 0.87,
      },
      {
        id: "15",
        title: "Parasite",
        description: "Korean thriller about class conflict and social inequality",
        category: "International Thriller",
        confidence: 0.94,
      },
    ],
  }

  // Find matching recommendations based on query keywords
  const queryLower = query.toLowerCase()
  let selectedRecommendations: Recommendation[] = []

  // Check for specific matches
  for (const [key, recommendations] of Object.entries(mockRecommendations)) {
    if (key !== "default" && queryLower.includes(key)) {
      selectedRecommendations.push(...recommendations)
    }
  }

  // If no specific matches, use default recommendations
  if (selectedRecommendations.length === 0) {
    selectedRecommendations = mockRecommendations.default
  }

  // Shuffle and limit results
  const shuffled = selectedRecommendations.sort(() => Math.random() - 0.5).slice(0, maxRecommendations)

  return shuffled
}
