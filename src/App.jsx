import { useState, useCallback } from 'react';
import MoodSelector from './components/MoodSelector';
import MovieCard from './components/MovieCard';
import SwipeControls from './components/SwipeControls';
import { fetchMoviePool } from './api/tmdb';
import './App.css';

const TOTAL_SWIPES = 10;

function App() {
  // Screen flow: 'landing' | 'mood-selection' | 'loading' | 'error' | 'empty' | 'swipe-deck' | 'complete'
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Mood selection state
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moodError, setMoodError] = useState('');

  // Movie pool (populated from TMDB)
  const [moviePool, setMoviePool] = useState([]);

  // Swipe deck state
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // A key that changes each swipe so React fully remounts the MovieCard
  const [cardKey, setCardKey] = useState(0);

  // ─── Landing ─────────────────────────────────────────────────
  const handleStartExploring = () => {
    setCurrentScreen('mood-selection');
  };

  // ─── Mood Selection ──────────────────────────────────────────
  const toggleMood = (id) => {
    setMoodError('');
    if (selectedMoods.includes(id)) {
      setSelectedMoods(selectedMoods.filter((m) => m !== id));
    } else {
      if (selectedMoods.length >= 3) {
        setMoodError('You can select up to 3 options.');
        return;
      }
      setSelectedMoods([...selectedMoods, id]);
    }
  };

  // ─── Fetch movies, then move to swipe deck ───────────────────
  const loadMovies = useCallback(async (moodIds) => {
    setCurrentScreen('loading');
    try {
      const pool = await fetchMoviePool(moodIds);
      if (pool.length === 0) {
        setCurrentScreen('empty');
      } else {
        setMoviePool(pool);
        setCurrentMovieIndex(0);
        setSwipeHistory([]);
        setWatchlist([]);
        setCardKey((k) => k + 1);
        setCurrentScreen('swipe-deck');
      }
    } catch {
      setCurrentScreen('error');
    }
  }, []);

  const handleContinue = () => {
    if (selectedMoods.length > 0) {
      loadMovies(selectedMoods);
    }
  };

  const handleRetry = () => {
    loadMovies(selectedMoods);
  };

  const handleBackToMoods = () => {
    setCurrentScreen('mood-selection');
  };

  // ─── Swipe Deck ──────────────────────────────────────────────
  const currentMovie = moviePool[currentMovieIndex];
  const swipeCount = swipeHistory.length;
  const isRoundComplete = swipeCount >= TOTAL_SWIPES;

  const handleSwipe = (direction) => {
    if (!currentMovie || isRoundComplete) return;

    const entry = { movieId: currentMovie.id, action: direction };
    const newHistory = [...swipeHistory, entry];
    setSwipeHistory(newHistory);

    if (direction === 'up') {
      setWatchlist((prev) => [...prev, currentMovie]);
    }

    if (newHistory.length >= TOTAL_SWIPES) {
      setCurrentScreen('complete');
    } else {
      setCurrentMovieIndex((prev) => prev + 1);
      setCardKey((prev) => prev + 1);
    }
  };

  // ─── Completion ───────────────────────────────────────────────
  const liked = swipeHistory.filter((s) => s.action === 'right').length;
  const watchlisted = swipeHistory.filter((s) => s.action === 'up').length;
  const passed = swipeHistory.filter((s) => s.action === 'left').length;

  const handleStartOver = () => {
    setSwipeHistory([]);
    setWatchlist([]);
    setMoviePool([]);
    setCurrentMovieIndex(0);
    setSelectedMoods([]);
    setMoodError('');
    setCardKey(0);
    setCurrentScreen('mood-selection');
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* Landing */}
      {currentScreen === 'landing' && (
        <div className="content-wrapper landing-wrapper">
          <h1 className="title">
            <span className="gradient-text">CineSwipe</span>
          </h1>
          <p className="subtitle">Find a movie that matches your mood.</p>
          <button className="primary-btn" onClick={handleStartExploring} type="button">
            Start Exploring
          </button>
        </div>
      )}

      {/* Mood Selection */}
      {currentScreen === 'mood-selection' && (
        <MoodSelector
          selectedIds={selectedMoods}
          onToggleOption={toggleMood}
          errorMsg={moodError}
          onContinue={handleContinue}
        />
      )}

      {/* Loading */}
      {currentScreen === 'loading' && (
        <div className="content-wrapper status-wrapper">
          <div className="loading-spinner" aria-label="Loading" />
          <p className="status-message">Finding movies...</p>
        </div>
      )}

      {/* Error */}
      {currentScreen === 'error' && (
        <div className="content-wrapper status-wrapper">
          <h2 className="selection-title">Something went wrong</h2>
          <p className="status-message status-message--subtle">
            We could not reach the movie database. Please check your connection and try again.
          </p>
          <div className="status-actions">
            <button className="primary-btn" onClick={handleRetry} type="button">
              Try Again
            </button>
            <button className="secondary-btn" onClick={handleBackToMoods} type="button">
              Change Moods
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {currentScreen === 'empty' && (
        <div className="content-wrapper status-wrapper">
          <h2 className="selection-title">No movies found</h2>
          <p className="status-message status-message--subtle">
            We could not find movies matching your current selection. Try choosing different moods.
          </p>
          <button className="primary-btn" onClick={handleBackToMoods} type="button">
            Back to Moods
          </button>
        </div>
      )}

      {/* Swipe Deck */}
      {currentScreen === 'swipe-deck' && currentMovie && (
        <div className="swipe-screen">
          <p className="swipe-progress">
            {swipeCount + 1} / {TOTAL_SWIPES}
          </p>

          <div className="card-area">
            <MovieCard key={cardKey} movie={currentMovie} onSwipe={handleSwipe} />
          </div>

          <SwipeControls onSwipe={handleSwipe} />

          <div className="swipe-hints">
            <span className="hint hint-left">Pass</span>
            <span className="hint hint-up">Watchlist</span>
            <span className="hint hint-right">Like</span>
          </div>
        </div>
      )}

      {/* Completion */}
      {currentScreen === 'complete' && (
        <div className="content-wrapper completion-wrapper">
          <h2 className="selection-title">Discovery complete</h2>

          <div className="completion-stats">
            <div className="stat-card">
              <span className="stat-number">{liked}</span>
              <span className="stat-label">Liked</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{watchlisted}</span>
              <span className="stat-label">Watchlist</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{passed}</span>
              <span className="stat-label">Passed</span>
            </div>
          </div>

          <button className="primary-btn" onClick={handleStartOver} type="button">
            Start Over
          </button>
        </div>
      )}

      {/* Background decoration */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
    </div>
  );
}

export default App;
