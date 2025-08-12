"use client"

import { useState, useEffect } from "react"
import { Search, TrendingUp, Film, User, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

// Pre-defined search suggestions for different categories
const SEARCH_SUGGESTIONS = {
  trending: ["Marvel movies", "Korean dramas", "British period dramas", "Sci-fi thrillers", "True crime documentaries"],
  platforms: ["Netflix originals", "HBO Max series", "Amazon Prime movies", "Disney+ shows", "Apple TV+ content"],
  actors: [
    "Ryan Reynolds movies",
    "Margot Robbie films",
    "Tom Hanks classics",
    "Meryl Streep performances",
    "Leonardo DiCaprio thrillers",
  ],
  genres: [
    "Romantic comedies",
    "Horror movies 2024",
    "Action blockbusters",
    "Mind-bending thrillers",
    "Feel-good movies",
  ],
}

interface SearchSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void
  isVisible: boolean
}

export function SearchSuggestions({ onSuggestionClick, isVisible }: SearchSuggestionsProps) {
  const [currentCategory, setCurrentCategory] = useState<keyof typeof SEARCH_SUGGESTIONS>("trending")

  // Rotate through categories every 3 seconds
  useEffect(() => {
    if (!isVisible) return

    const categories = Object.keys(SEARCH_SUGGESTIONS) as Array<keyof typeof SEARCH_SUGGESTIONS>
    let currentIndex = 0

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % categories.length
      setCurrentCategory(categories[currentIndex])
    }, 3000)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "trending":
        return <TrendingUp className="w-4 h-4" />
      case "platforms":
        return <Globe className="w-4 h-4" />
      case "actors":
        return <User className="w-4 h-4" />
      case "genres":
        return <Film className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "trending":
        return "Trending Searches"
      case "platforms":
        return "Popular Platforms"
      case "actors":
        return "Search by Actor"
      case "genres":
        return "Browse by Genre"
      default:
        return "Suggestions"
    }
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 border border-blue-500/50 rounded-lg shadow-2xl backdrop-blur-sm z-50">
      <div className="p-4">
        {/* Category Header */}
        <div className="flex items-center gap-2 mb-3 text-blue-300">
          {getCategoryIcon(currentCategory)}
          <span className="font-medium text-sm">{getCategoryTitle(currentCategory)}</span>
        </div>

        {/* Suggestions Grid */}
        <div className="grid grid-cols-1 gap-1">
          {SEARCH_SUGGESTIONS[currentCategory].map((suggestion, index) => (
            <Button
              key={`${currentCategory}-${index}`}
              variant="ghost"
              className="justify-start text-left text-gray-300 hover:text-white hover:bg-blue-600/20 transition-colors"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <Search className="w-3 h-3 mr-2 text-gray-500" />
              {suggestion}
            </Button>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-1 mt-4 pt-3 border-t border-gray-700">
          {Object.keys(SEARCH_SUGGESTIONS).map((category) => (
            <button
              key={category}
              onClick={() => setCurrentCategory(category as keyof typeof SEARCH_SUGGESTIONS)}
              className={`w-2 h-2 rounded-full transition-colors ${
                category === currentCategory ? "bg-blue-500" : "bg-gray-600 hover:bg-gray-500"
              }`}
              aria-label={`Show ${category} suggestions`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
