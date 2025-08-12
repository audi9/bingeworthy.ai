"use client"

import { useState } from "react"
import { ChevronDown, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { SearchFilters } from "@/lib/types"

// Available filter options
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

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
]

const LANGUAGES = [
  { code: "EN", name: "English" },
  { code: "ES", name: "Spanish" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "IT", name: "Italian" },
  { code: "JA", name: "Japanese" },
  { code: "KO", name: "Korean" },
  { code: "HI", name: "Hindi" },
  { code: "ZH", name: "Chinese" },
]

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
]

const CONTENT_TYPES = [
  { value: "", label: "All Content" },
  { value: "movie", label: "Movies Only" },
  { value: "tv", label: "TV Shows Only" },
]

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onClearFilters: () => void
  resultCount?: number
}

export function SearchFiltersComponent({ filters, onFiltersChange, onClearFilters, resultCount }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Helper function to update a single filter
  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  // Count active filters for display
  const activeFilterCount = Object.values(filters).filter((value) => value && value !== "").length

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="border-blue-500/50 text-blue-300 hover:bg-blue-600/20"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </Button>

        {/* Results count */}
        {resultCount !== undefined && <span className="text-sm text-gray-400">{resultCount} results found</span>}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="bg-black/30 rounded-lg p-4 border border-blue-500/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Content Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-600 text-gray-300 bg-transparent"
                  >
                    {CONTENT_TYPES.find((t) => t.value === filters.type)?.label || "All Content"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-black border-gray-600">
                  {CONTENT_TYPES.map((type) => (
                    <DropdownMenuItem
                      key={type.value}
                      onClick={() => updateFilter("type", type.value)}
                      className="text-gray-300 hover:bg-blue-600/20"
                    >
                      {type.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Streaming Platform Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Streaming Platform</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-600 text-gray-300 bg-transparent"
                  >
                    {filters.platform || "All Platforms"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-black border-gray-600 max-h-60 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => updateFilter("platform", "")}
                    className="text-gray-300 hover:bg-blue-600/20"
                  >
                    All Platforms
                  </DropdownMenuItem>
                  {STREAMING_PLATFORMS.map((platform) => (
                    <DropdownMenuItem
                      key={platform}
                      onClick={() => updateFilter("platform", platform)}
                      className="text-gray-300 hover:bg-blue-600/20"
                    >
                      {platform}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Genre Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-600 text-gray-300 bg-transparent"
                  >
                    {filters.genre || "All Genres"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-black border-gray-600 max-h-60 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => updateFilter("genre", "")}
                    className="text-gray-300 hover:bg-blue-600/20"
                  >
                    All Genres
                  </DropdownMenuItem>
                  {GENRES.map((genre) => (
                    <DropdownMenuItem
                      key={genre}
                      onClick={() => updateFilter("genre", genre)}
                      className="text-gray-300 hover:bg-blue-600/20"
                    >
                      {genre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-600 text-gray-300 bg-transparent"
                  >
                    {LANGUAGES.find((l) => l.code === filters.language)?.name || "All Languages"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-black border-gray-600 max-h-60 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => updateFilter("language", "")}
                    className="text-gray-300 hover:bg-blue-600/20"
                  >
                    All Languages
                  </DropdownMenuItem>
                  {LANGUAGES.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => updateFilter("language", language.code)}
                      className="text-gray-300 hover:bg-blue-600/20"
                    >
                      {language.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="border-red-500/50 text-red-400 hover:bg-red-600/20 bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.type && (
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border border-blue-500/50">
              {CONTENT_TYPES.find((t) => t.value === filters.type)?.label}
              <X className="w-3 h-3 ml-1 cursor-pointer hover:text-white" onClick={() => updateFilter("type", "")} />
            </Badge>
          )}
          {filters.platform && (
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border border-blue-500/50">
              {filters.platform}
              <X
                className="w-3 h-3 ml-1 cursor-pointer hover:text-white"
                onClick={() => updateFilter("platform", "")}
              />
            </Badge>
          )}
          {filters.genre && (
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border border-blue-500/50">
              {filters.genre}
              <X className="w-3 h-3 ml-1 cursor-pointer hover:text-white" onClick={() => updateFilter("genre", "")} />
            </Badge>
          )}
          {filters.language && (
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border border-blue-500/50">
              {LANGUAGES.find((l) => l.code === filters.language)?.name}
              <X
                className="w-3 h-3 ml-1 cursor-pointer hover:text-white"
                onClick={() => updateFilter("language", "")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
