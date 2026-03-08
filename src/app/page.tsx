"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  Search,
  Loader2,
  Music,
  Download,
  Volume2,
  VolumeX,
  ListMusic,
  X,
  ChevronDown,
  Clock,
  Calendar,
  User,
  Disc,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Share2,
  Globe,
  Headphones,
  Waves,
} from "lucide-react";

// Types
interface Track {
  track_url: string;
  thumbnail: string;
  title: string;
  artist: string;
  duration: string;
  preview_url: string;
  album: string;
  release_date: string;
}

interface CurrentTrack extends Track {
  url?: string;
  isLoading?: boolean;
  downloadUrl?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

export default function SpotifyPlayer() {
  // State management
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Track[]>([
    {
      title: "Blinding Lights",
      artist: "The Weeknd",
      thumbnail: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
      duration: "3:20",
      track_url: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b",
      preview_url: "",
      album: "After Hours",
      release_date: "2020-03-20",
    },
    {
      title: "Dance Monkey",
      artist: "Tones and I",
      thumbnail: "https://i.scdn.co/image/ab67616d0000b273c86c6a3c7b6b5b5c5b5c5b5c",
      duration: "3:29",
      track_url: "spotify:track:5ZULALImTm80tzUbYQYM9d",
      preview_url: "",
      album: "The Kids Are Coming",
      release_date: "2019-05-10",
    },
  ]);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  // Auto search effect
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      handleAutoSearch();
    }
  }, [debouncedQuery]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("sylva-favorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem("sylva-favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Auto search function
  const handleAutoSearch = async () => {
    if (debouncedQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      const data = await res.json();
      
      if (data.status && data.result) {
        setResults(data.result);
        
        // Add to recent searches
        setRecentSearches(prev => {
          const newSearches = [debouncedQuery, ...prev.filter(s => s !== debouncedQuery)].slice(0, 5);
          return newSearches;
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Manual search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    await handleAutoSearch();
    
    // Focus on results
    if (results.length > 0) {
      const resultsElement = document.getElementById("search-results");
      resultsElement?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Play track function
  const playTrack = useCallback(async (track: Track) => {
    // Show loading state
    setCurrentTrack({
      ...track,
      isLoading: true,
    });

    // Add to history
    setHistory(prev => [track, ...prev].slice(0, 20));

    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(track.track_url)}`);
      const data = await res.json();

      if (data.status && data.result?.download_url) {
        setCurrentTrack({
          ...track,
          url: data.result.download_url,
          downloadUrl: data.result.download_url,
          isLoading: false,
        });

        // Auto play
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.volume = volume;
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                toast.success(`Now playing: ${track.title}`, {
                  icon: "🎵",
                });
              })
              .catch(e => {
                console.log("Autoplay failed:", e);
                toast.error("Click play to start");
              });
          }
        }, 100);
      } else {
        throw new Error(data.message || "Download failed");
      }
    } catch (error: any) {
      console.error("Play error:", error);
      toast.error(error.message || "Failed to load track");
      setCurrentTrack(null);
    }
  }, [volume]);

  // Queue management
  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
    toast.success(`Added to queue: ${track.title}`, {
      icon: "➕",
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      // If no queue, play from results
      if (results.length > 0) {
        const randomIndex = shuffleMode 
          ? Math.floor(Math.random() * results.length)
          : 0;
        playTrack(results[randomIndex]);
      }
      return;
    }

    const nextTrack = shuffleMode
      ? queue[Math.floor(Math.random() * queue.length)]
      : queue[0];

    if (nextTrack) {
      playTrack(nextTrack);
      if (!shuffleMode) {
        setQueue(prev => prev.slice(1));
      }
    }
  }, [queue, shuffleMode, results, playTrack]);

  const playPrevious = useCallback(() => {
    if (history.length > 1) {
      playTrack(history[1]);
    }
  }, [history, playTrack]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === "all" || queue.length > 0) {
        playNext();
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [repeatMode, playNext]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Favorites toggle
  const toggleFavorite = useCallback((trackUrl: string) => {
    setFavorites(prev => {
      if (prev.includes(trackUrl)) {
        toast.success("Removed from favorites");
        return prev.filter(url => url !== trackUrl);
      } else {
        toast.success("Added to favorites");
        return [...prev, trackUrl];
      }
    });
  }, []);

  // Format time
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setProgress(value);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            SYLVA MUSIC
          </h1>
          <p className="text-slate-600 text-sm md:text-base flex items-center justify-center gap-2">
            <Waves className="w-4 h-4" />
            Professional Spotify Downloader
            <Headphones className="w-4 h-4" />
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto mb-8"
        >
          <form onSubmit={handleSearch} className="relative">
            <motion.div
              variants={itemVariants}
              className="relative group"
            >
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for songs, artists, or albums..."
                className="w-full h-14 pl-14 pr-24 glass rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isSearching && (
                  <Loader2 className="animate-spin text-blue-500" size={20} />
                )}
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Search
                </button>
              </div>
            </motion.div>
          </form>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-2 mt-4"
            >
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    handleAutoSearch();
                  }}
                  className="px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-sm text-slate-600 hover:bg-white/50 transition-colors"
                >
                  {search}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Left Column - Search Results / Favorites */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-[400px]"
          >
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setShowFavorites(false);
                  setShowQueue(false);
                }}
                className={`flex-1 px-4 py-2 rounded-xl transition-all ${
                  !showFavorites && !showQueue
                    ? "bg-blue-500 text-white shadow-lg"
                    : "glass text-slate-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Search size={16} />
                  <span className="hidden sm:inline">Search Results</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setShowFavorites(true);
                  setShowQueue(false);
                }}
                className={`flex-1 px-4 py-2 rounded-xl transition-all ${
                  showFavorites
                    ? "bg-blue-500 text-white shadow-lg"
                    : "glass text-slate-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Heart size={16} fill={showFavorites ? "white" : "none"} />
                  <span className="hidden sm:inline">Favorites</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setShowQueue(true);
                  setShowFavorites(false);
                }}
                className={`flex-1 px-4 py-2 rounded-xl transition-all ${
                  showQueue
                    ? "bg-blue-500 text-white shadow-lg"
                    : "glass text-slate-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ListMusic size={16} />
                  <span className="hidden sm:inline">Queue</span>
                  {queue.length > 0 && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                      {queue.length}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Content Panel */}
            <div className="glass rounded-2xl max-h-[600px] overflow-y-auto scrollbar-hide">
              <AnimatePresence mode="wait">
                {showFavorites ? (
                  // Favorites Panel
                  <motion.div
                    key="favorites"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4"
                  >
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Heart className="text-red-500" size={20} fill="currentColor" />
                      Your Favorites
                    </h3>
                    
                    {favorites.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Heart size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No favorites yet</p>
                        <p className="text-sm">Heart your favorite songs</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {results
                          .filter(track => favorites.includes(track.track_url))
                          .map((track, index) => (
                            <TrackItem
                              key={index}
                              track={track}
                              onPlay={() => playTrack(track)}
                              onAddToQueue={() => addToQueue(track)}
                              isFavorite={favorites.includes(track.track_url)}
                              onToggleFavorite={() => toggleFavorite(track.track_url)}
                            />
                          ))}
                      </div>
                    )}
                  </motion.div>
                ) : showQueue ? (
                  // Queue Panel
                  <motion.div
                    key="queue"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4"
                  >
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ListMusic size={20} />
                      Play Queue
                      {queue.length > 0 && (
                        <span className="text-sm font-normal text-slate-500 ml-auto">
                          {queue.length} tracks
                        </span>
                      )}
                    </h3>
                    
                    {queue.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Queue is empty</p>
                        <p className="text-sm">Add songs from search results</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {queue.map((track, index) => (
                          <TrackItem
                            key={index}
                            track={track}
                            onPlay={() => playTrack(track)}
                            onRemove={() => removeFromQueue(index)}
                            showRemove
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  // Search Results Panel
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4"
                    id="search-results"
                  >
                    <h3 className="font-bold text-slate-800 mb-4">
                      {results.length > 0 
                        ? `${results.length} tracks found`
                        : isSearching 
                        ? "Searching..."
                        : query 
                        ? "No results found"
                        : "Start searching for music"
                      }
                    </h3>
                    
                    {isSearching ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                        <p className="text-slate-500">Searching for "{query}"...</p>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-2">
                        {results.map((track, index) => (
                          <TrackItem
                            key={index}
                            track={track}
                            onPlay={() => playTrack(track)}
                            onAddToQueue={() => addToQueue(track)}
                            isFavorite={favorites.includes(track.track_url)}
                            onToggleFavorite={() => toggleFavorite(track.track_url)}
                            isCurrent={currentTrack?.track_url === track.track_url}
                          />
                        ))}
                      </div>
                    ) : query ? (
                      <div className="text-center py-12 text-slate-500">
                        <Music size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No tracks found for "{query}"</p>
                        <p className="text-sm">Try different keywords</p>
                      </div>
                    ) : (
                      // Trending section
                      <div>
                        <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                          <TrendingUp size={16} />
                          Trending Now
                        </h4>
                        <div className="space-y-2">
                          {trendingSongs.map((track, index) => (
                            <TrackItem
                              key={index}
                              track={track}
                              onPlay={() => playTrack(track)}
                              onAddToQueue={() => addToQueue(track)}
                            />
                          ))}
                        </div>
                        
                        <h4 className="text-sm font-semibold text-slate-600 mt-6 mb-3 flex items-center gap-2">
                          <Sparkles size={16} />
                          Recently Played
                        </h4>
                        {history.length > 0 ? (
                          <div className="space-y-2">
                            {history.slice(0, 3).map((track, index) => (
                              <TrackItem
                                key={index}
                                track={track}
                                onPlay={() => playTrack(track)}
                                compact
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            Your played tracks will appear here
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right Column - Player */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-[400px]"
            ref={playerRef}
          >
            <AnimatePresence mode="wait">
              {currentTrack ? (
                <motion.div
                  key="player"
                  variants={itemVariants}
                  className={`glass rounded-3xl p-6 transition-all ${
                    isCompact ? "scale-95" : ""
                  }`}
                >
                  {/* Player Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setIsCompact(!isCompact)}
                      className="p-2 hover:bg-white/30 rounded-xl transition-colors"
                    >
                      {isCompact ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </button>
                    
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-white/30 rounded-xl transition-colors"
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </div>

                  {/* Album Art */}
                  <motion.div
                    className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl mb-6 group"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <img
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      className={`w-full h-full object-cover transition-transform duration-[20s] ${
                        isPlaying ? "scale-110" : "scale-100"
                      }`}
                    />
                    
                    {/* Loading Overlay */}
                    {currentTrack.isLoading && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="animate-spin text-white mb-2" size={40} />
                          <p className="text-white text-sm">Converting...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Play overlay on hover */}
                    {!currentTrack.isLoading && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            if (isPlaying) {
                              audioRef.current?.pause();
                              setIsPlaying(false);
                            } else {
                              audioRef.current?.play();
                              setIsPlaying(true);
                            }
                          }}
                          className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          {isPlaying ? (
                            <Pause size={32} fill="black" />
                          ) : (
                            <Play size={32} fill="black" className="ml-1" />
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>

                  {/* Track Info */}
                  <div className="mb-6">
                    <h2 className="font-bold text-xl text-slate-800 truncate">
                      {currentTrack.title}
                    </h2>
                    <p className="text-slate-500 text-sm truncate">
                      {currentTrack.artist}
                    </p>
                    
                    {/* Additional track info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Disc size={12} />
                        {currentTrack.album}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(currentTrack.release_date).getFullYear()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={progress}
                      onChange={handleSeek}
                      disabled={!currentTrack.url}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{formatTime(progress)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setShuffleMode(!shuffleMode)}
                      className={`p-2 rounded-xl transition-colors ${
                        shuffleMode ? "text-blue-500" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Shuffle size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={playPrevious}
                        disabled={history.length < 2}
                        className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <SkipBack size={24} fill="currentColor" />
                      </button>

                      <button
                        onClick={() => {
                          if (!currentTrack.url) return;
                          if (isPlaying) {
                            audioRef.current?.pause();
                            setIsPlaying(false);
                          } else {
                            audioRef.current?.play();
                            setIsPlaying(true);
                          }
                        }}
                        disabled={currentTrack.isLoading || !currentTrack.url}
                        className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {currentTrack.isLoading ? (
                          <Loader2 className="animate-spin text-white" size={24} />
                        ) : isPlaying ? (
                          <Pause size={24} fill="white" />
                        ) : (
                          <Play size={24} fill="white" className="ml-1" />
                        )}
                      </button>

                      <button
                        onClick={playNext}
                        disabled={queue.length === 0 && results.length === 0}
                        className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <SkipForward size={24} fill="currentColor" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const modes: ("none" | "one" | "all")[] = ["none", "all", "one"];
                        const currentIndex = modes.indexOf(repeatMode);
                        const nextMode = modes[(currentIndex + 1) % modes.length];
                        setRepeatMode(nextMode);
                        
                        toast(
                          nextMode === "none" 
                            ? "Repeat off" 
                            : nextMode === "one" 
                            ? "Repeat one" 
                            : "Repeat all",
                          { icon: "🔁" }
                        );
                      }}
                      className={`p-2 rounded-xl transition-colors ${
                        repeatMode !== "none" ? "text-blue-500" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {repeatMode === "one" ? (
                        <Repeat size={20} className="relative">
                          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold">1</span>
                        </Repeat>
                      ) : (
                        <Repeat size={20} />
                      )}
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        setIsMuted(val === 0);
                      }}
                      className="flex-1 h-1"
                    />
                    <span className="text-xs text-slate-400 w-12 text-right">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

                  {/* Download Button */}
                  {currentTrack.downloadUrl && (
                    <motion.a
                      href={currentTrack.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      <Download size={18} />
                      Download MP3
                    </motion.a>
                  )}
                </motion.div>
              ) : (
                // Empty State
                <motion.div
                  key="empty"
                  variants={itemVariants}
                  className="glass rounded-3xl p-12 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-3xl opacity-20" />
                    <Music size={64} className="mx-auto mb-4 text-slate-400 relative" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">No Track Selected</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Search for a song and click play to start
                  </p>
                  <button
                    onClick={() => searchInputRef.current?.focus()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <Search size={16} />
                    Start Searching
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentTrack?.url}
          preload="auto"
        />
      </div>
    </div>
  );
}

// Track Item Component
interface TrackItemProps {
  track: Track;
  onPlay: () => void;
  onAddToQueue?: () => void;
  onRemove?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  isCurrent?: boolean;
  showRemove?: boolean;
  compact?: boolean;
}

function TrackItem({
  track,
  onPlay,
  onAddToQueue,
  onRemove,
  onToggleFavorite,
  isFavorite,
  isCurrent,
  showRemove,
  compact = false,
}: TrackItemProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      className={`group relative flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
        isCurrent
          ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
          : "hover:bg-white/50"
      }`}
      onClick={onPlay}
    >
      <img
        src={track.thumbnail}
        alt={track.title}
        className="w-12 h-12 rounded-lg object-cover shadow-md"
      />
      
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-slate-800 truncate ${compact ? "text-sm" : ""}`}>
          {track.title}
        </p>
        <p className="text-xs text-slate-500 truncate">{track.artist}</p>
        
        {!compact && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={10} />
              {track.duration}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors ${
              isFavorite ? "text-red-500" : "text-slate-400 hover:text-red-500"
            }`}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
        
        {onAddToQueue && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToQueue();
            }}
            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ListMusic size={16} />
          </button>
        )}
        
        {showRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg transition-all"
        >
          <Play size={16} fill="white" />
        </button>
      </div>

      {/* Current playing indicator */}
      {isCurrent && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
      )}
    </motion.div>
  );
}