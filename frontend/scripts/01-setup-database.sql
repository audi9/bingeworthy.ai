-- Creating comprehensive database schema for bingeworthy.ai
-- This script sets up all the tables needed for our movie/TV show recommendation platform

-- Movies and TV Shows table - stores all content from various streaming platforms
CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Basic content information
    title TEXT NOT NULL,                    -- Movie/show title like "Stranger Things"
    type TEXT NOT NULL CHECK(type IN ('movie', 'tv')), -- Whether it's a movie or TV show
    description TEXT,                       -- Plot summary/description
    release_year INTEGER,                   -- Year it was released
    runtime INTEGER,                        -- Duration in minutes
    poster_url TEXT,                        -- URL to poster image
    backdrop_url TEXT,                      -- URL to backdrop image
    
    -- Rating information from multiple sources
    imdb_rating REAL,                       -- IMDB rating (0-10)
    rotten_tomatoes_rating INTEGER,         -- Rotten Tomatoes percentage (0-100)
    metacritic_rating INTEGER,              -- Metacritic score (0-100)
    tmdb_rating REAL,                       -- The Movie Database rating (0-10)
    
    -- Content classification
    genre TEXT,                             -- Comma-separated genres like "Action,Drama"
    language TEXT,                          -- Primary language like "en", "hi", "es"
    country TEXT,                           -- Country of origin like "US", "IN", "UK"
    
    -- Streaming platform availability
    streaming_platforms TEXT,               -- JSON array of platforms like ["Netflix", "HBO Max"]
    
    -- Additional metadata
    cast TEXT,                              -- JSON array of main cast members
    director TEXT,                          -- Director name(s)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Search cache table - stores LLM search results to minimize API calls
CREATE TABLE IF NOT EXISTS search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Search query information
    query TEXT NOT NULL,                    -- The search query user typed
    query_hash TEXT UNIQUE NOT NULL,        -- MD5 hash of query for fast lookup
    
    -- Search results
    results TEXT NOT NULL,                  -- JSON array of content IDs that match
    llm_response TEXT,                      -- LLM's explanation/reasoning for recommendations
    
    -- Cache management
    hit_count INTEGER DEFAULT 1,            -- How many times this cache was used
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME                     -- When this cache entry expires
);

-- User preferences table - for future user accounts and personalization
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,                           -- User identifier (for future auth)
    preferred_genres TEXT,                  -- JSON array of favorite genres
    preferred_platforms TEXT,               -- JSON array of subscribed platforms
    preferred_languages TEXT,               -- JSON array of preferred languages
    blocked_content TEXT,                   -- JSON array of content IDs to hide
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin settings table - for customizing the app behavior
CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,       -- Setting name like "card_fields", "search_filters"
    setting_value TEXT NOT NULL,            -- JSON value of the setting
    description TEXT,                       -- Human-readable description
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin settings for card customization
INSERT OR IGNORE INTO admin_settings (setting_key, setting_value, description) VALUES
('card_fields', '["title", "rating", "genre", "platform", "year"]', 'Fields to display on content cards'),
('search_filters', '["platform", "genre", "language", "country", "type"]', 'Available search filters'),
('featured_platforms', '["Netflix", "HBO Max", "Amazon Prime", "Apple TV+", "Disney+"]', 'Main streaming platforms to highlight');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_genre ON content(genre);
CREATE INDEX IF NOT EXISTS idx_content_platform ON content(streaming_platforms);
CREATE INDEX IF NOT EXISTS idx_content_rating ON content(imdb_rating DESC);
CREATE INDEX IF NOT EXISTS idx_search_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_expires ON search_cache(expires_at);
