"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// Interface for AI recommendation props
interface AIRecommendationsProps {
  searchQuery: string // Current search query from user
  onRecommendationClick: (recommendation: string) => void // Callback when user clicks a recommendation
  className?: string // Optional CSS classes
}

// Interface for individual recommendation
interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  confidence: number // AI confidence score (0-1)
}

/**
 * AI-powered recommendations component that suggests content based on user's search query
 * Uses free LLM APIs to generate personalized recommendations
 */
export function AIRecommendations({ searchQuery, onRecommendationClick, className }: AIRecommendationsProps) {
  // State for storing AI recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  // Loading state for API calls
  const [loading, setLoading] = useState(false)
  // Error state for failed API calls
  const [error, setError] = useState<string | null>(null)
  // Track if we should show recommendations
  const [showRecommendations, setShowRecommendations] = useState(false)

  /**
   * Generate AI recommendations based on search query
   * This function calls our API endpoint that uses free LLM services
   */
  const generateRecommendations = async (query: string) => {
    // Don't generate recommendations for very short queries
    if (!query || query.trim().length < 3) {
      setRecommendations([])
      setShowRecommendations(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call our API endpoint for AI recommendations
      const response = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          maxRecommendations: 6, // Limit to 6 recommendations for better UX
        }),
      })

      const result = await response.json()

      if (result.success) {
        setRecommendations(result.data || [])
        setShowRecommendations(true)
      } else {
        setError(result.error || "Failed to generate recommendations")
        setShowRecommendations(false)
      }
    } catch (err) {
      console.error("Error generating AI recommendations:", err)
      setError("Failed to connect to AI service")
      setShowRecommendations(false)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Refresh recommendations with the current search query
   */
  const refreshRecommendations = () => {
    if (searchQuery) {
      generateRecommendations(searchQuery)
    }
  }

  // Generate recommendations when search query changes
  useEffect(() => {
    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(() => {
      generateRecommendations(searchQuery)
    }, 1000) // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Don't render anything if no search query or no recommendations
  if (!searchQuery || (!loading && !showRecommendations && !error)) {
    return null
  }

  /**
   * Get confidence color based on AI confidence score
   */
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400"
    if (confidence >= 0.6) return "text-yellow-400"
    return "text-blue-400"
  }

  /**
   * Get confidence label based on score
   */
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Match"
    if (confidence >= 0.6) return "Good Match"
    return "Possible Match"
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header section with title and refresh button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
          {searchQuery && (
            <Badge variant="outline" className="border-blue-500/50 text-blue-300">
              Based on: "{searchQuery}"
            </Badge>
          )}
        </div>

        {/* Refresh button */}
        {showRecommendations && (
          <Button
            onClick={refreshRecommendations}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <Card className="bg-black/40 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-gray-300">
                AI is analyzing your preferences and generating personalized recommendations...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-red-400">{error}</span>
              <Button
                onClick={refreshRecommendations}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-600/20 bg-transparent"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations grid */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((recommendation) => (
            <Card
              key={recommendation.id}
              className="bg-black/40 border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => onRecommendationClick(recommendation.title)}
            >
              <CardContent className="p-4">
                {/* Recommendation header */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                    {recommendation.title}
                  </h4>
                  <div className="flex items-center gap-1 ml-2">
                    <div
                      className={cn("w-2 h-2 rounded-full", {
                        "bg-green-400": recommendation.confidence >= 0.8,
                        "bg-yellow-400": recommendation.confidence >= 0.6 && recommendation.confidence < 0.8,
                        "bg-blue-400": recommendation.confidence < 0.6,
                      })}
                    />
                  </div>
                </div>

                {/* Category badge */}
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 mb-2 text-xs">
                  {recommendation.category}
                </Badge>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{recommendation.description}</p>

                {/* Confidence indicator */}
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-medium", getConfidenceColor(recommendation.confidence))}>
                    {getConfidenceLabel(recommendation.confidence)}
                  </span>
                  <span className="text-xs text-gray-500">{Math.round(recommendation.confidence * 100)}% match</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state for no recommendations */}
      {showRecommendations && recommendations.length === 0 && !loading && !error && (
        <Card className="bg-black/40 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">No AI recommendations available for this search. Try a different query!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
