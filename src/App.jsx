import { useState, useCallback, useRef } from 'react';
import MoodSelector from './components/MoodSelector';
import MovieCard from './components/MovieCard';
import SwipeControls from './components/SwipeControls';
import { fetchMoviePool } from './api/tmdb';
import { createCandidatePool } from './ml/candidatePool';
import { scoreCandidates } from './ml/scoreCandidates';
import { updateUserVector } from './ml/updateUserVector';
import { createInitialUserVector } from './ml/userVector';
import { movieToVector } from './ml/vectorize';
import MLInspector from './components/MLInspector';
import './App.css';

const TOTAL_SWIPES = 10;

function logRecommendationCycle({
  selectedMoods,
  currentMovie,
  action = null,
  userVectorBefore,
  userVectorAfter,
  rankedCandidates,
  nextMovie,
}) {
  if (!import.meta.env.DEV) return;

  console.log('[CineSwipe ML] recommendation cycle', {
    selectedMoods: [...selectedMoods],
    currentMovie: currentMovie
      ? { title: currentMovie.title, id: currentMovie.id }
      : null,
    swipeAction: action,
    userVectorBefore: [...userVectorBefore],
    userVectorAfter: [...userVectorAfter],
    top3RemainingCandidates: rankedCandidates.slice(0, 3).map(({ movie, score }) => ({
      title: movie.title,
      id: movie.id,
      score: Number(score.toFixed(4)),
    })),
    selectedNextMovie: nextMovie
      ? { title: nextMovie.title, id: nextMovie.id }
      : null,
  });
}

function App() {
  // Screen flow: 'landing' | 'mood-selection' | 'loading' | 'error' | 'empty' | 'swipe-deck' | 'complete'
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Mood selection state
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moodError, setMoodError] = useState('');

  const candidatePoolRef = useRef(null);

  // Swipe deck state
  const [currentMovie, setCurrentMovie] = useState(null);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [, setWatchlist] = useState([]);
  const [userVector, setUserVector] = useState([]);
  const [rankedCandidates, setRankedCandidates] = useState([]);
  const [lastSwipe, setLastSwipe] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

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
      if (import.meta.env.DEV) {
        console.log('[CineSwipe ML] initial candidate load', {
          selectedMoods: [...moodIds],
          initialCandidateCount: pool.length,
          replenishmentRequested: false,
        });
      }

      if (pool.length === 0) {
        if (import.meta.env.DEV) {
          console.warn('[CineSwipe ML] no movies found', {
            reason: 'initial candidate pool was empty after TMDB filtering',
            swipeCount: 0,
            candidatePoolSize: 0,
            replenishmentRequested: false,
          });
        }
        setCurrentScreen('empty');
      } else {
        const initialVector = createInitialUserVector(moodIds);
        const nextCandidatePool = createCandidatePool(pool);
        const ranked = scoreCandidates(
          initialVector,
          nextCandidatePool.getAvailable()
        );
        const initialMovie = ranked[0]?.movie || null;

        if (import.meta.env.DEV) {
          console.log('[CineSwipe ML] initial candidate pool state', {
            candidatePoolSize: nextCandidatePool.size(),
            rankedCandidateCount: ranked.length,
            replenishmentRequested: false,
          });
        }

        logRecommendationCycle({
          selectedMoods: moodIds,
          currentMovie: initialMovie,
          userVectorBefore: initialVector,
          userVectorAfter: initialVector,
          rankedCandidates: ranked,
          nextMovie: initialMovie,
        });

        candidatePoolRef.current = nextCandidatePool;
        setCurrentMovie(initialMovie);
        setUserVector(initialVector);
        setRankedCandidates(ranked);
        setLastSwipe(null);
        setSwipeHistory([]);
        setWatchlist([]);
        setCardKey((k) => k + 1);
        setCurrentScreen(ranked.length > 0 ? 'swipe-deck' : 'empty');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[CineSwipe ML] movie load failed', {
          reason: 'TMDB request or movie transformation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          noMoviesFoundScreen: false,
        });
      }
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
  const swipeCount = swipeHistory.length;
  const isRoundComplete = swipeCount >= TOTAL_SWIPES;

  const handleSwipe = (direction) => {
    const activePool = candidatePoolRef.current;
    if (!currentMovie || !activePool || isRoundComplete) return;

    const entry = { movieId: currentMovie.id, action: direction };
    const newHistory = [...swipeHistory, entry];
    setSwipeHistory(newHistory);

    if (direction === 'up') {
      setWatchlist((prev) => [...prev, currentMovie]);
    }

    const poolSizeBeforeConsume = activePool.size();
    activePool.consume(currentMovie.id);
    const poolSizeAfterConsume = activePool.size();

    if (import.meta.env.DEV) {
      console.log('[CineSwipe ML] candidate pool consumption', {
        movie: { title: currentMovie.title, id: currentMovie.id },
        swipeAction: direction,
        swipeCount: newHistory.length,
        candidatePoolSizeBeforeConsume: poolSizeBeforeConsume,
        candidatePoolSizeAfterConsume: poolSizeAfterConsume,
        replenishmentRequested: false,
      });
    }

    const updatedVector =
      direction === 'right' || direction === 'left'
        ? updateUserVector(
            userVector,
            Array.isArray(currentMovie.vector)
              ? currentMovie.vector
              : movieToVector(currentMovie),
            direction
          )
        : userVector.slice();

    setUserVector(updatedVector);

    if (newHistory.length >= TOTAL_SWIPES) {
      if (import.meta.env.DEV) {
        console.log('[CineSwipe ML] recommendation cycle ended', {
          reason: '10-swipe round complete',
          swipeCount: newHistory.length,
          candidatePoolSize: activePool.size(),
          noMoviesFoundScreen: false,
          replenishmentRequested: false,
        });
      }
      logRecommendationCycle({
        selectedMoods,
        currentMovie,
        action: direction,
        userVectorBefore: userVector,
        userVectorAfter: updatedVector,
        rankedCandidates: [],
        nextMovie: null,
      });
      setLastSwipe({
        action: direction,
        beforeVector: userVector.slice(),
        afterVector: updatedVector.slice(),
        beforeRanking: rankedCandidates,
        afterRanking: [],
      });
      setRankedCandidates([]);
      setCurrentScreen('complete');
    } else {
      const ranked = scoreCandidates(updatedVector, activePool.getAvailable());
      const nextMovie = ranked[0]?.movie || null;

      logRecommendationCycle({
        selectedMoods,
        currentMovie,
        action: direction,
        userVectorBefore: userVector,
        userVectorAfter: updatedVector,
        rankedCandidates: ranked,
        nextMovie,
      });
      setLastSwipe({
        action: direction,
        beforeVector: userVector.slice(),
        afterVector: updatedVector.slice(),
        beforeRanking: rankedCandidates,
        afterRanking: ranked,
      });
      setRankedCandidates(ranked);

      if (!nextMovie) {
        if (import.meta.env.DEV) {
          console.warn('[CineSwipe ML] recommendation pool exhausted', {
            reason: 'candidate pool became empty before 10 swipes',
            swipeCount: newHistory.length,
            candidatePoolSize: activePool.size(),
            noMoviesFoundScreen: false,
            replenishmentRequested: false,
          });
        }
        setCurrentMovie(null);
        setCurrentScreen('complete');
      } else {
        setCurrentMovie(nextMovie);
        setCardKey((prev) => prev + 1);
      }
    }
  };

  // ─── Completion ───────────────────────────────────────────────
  const liked = swipeHistory.filter((s) => s.action === 'right').length;
  const watchlisted = swipeHistory.filter((s) => s.action === 'up').length;
  const passed = swipeHistory.filter((s) => s.action === 'left').length;

  const handleStartOver = () => {
    setSwipeHistory([]);
    setWatchlist([]);
    setCurrentMovie(null);
    setUserVector([]);
    setRankedCandidates([]);
    setLastSwipe(null);
    setIsInspectorOpen(false);
    candidatePoolRef.current = null;
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
          {import.meta.env.DEV && (
            <button
              className="secondary-btn ml-inspector-toggle"
              onClick={() => setIsInspectorOpen((open) => !open)}
              type="button"
            >
              {isInspectorOpen ? 'Hide ML Inspector' : 'ML Inspector'}
            </button>
          )}
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

      {import.meta.env.DEV && isInspectorOpen && (
        <MLInspector
          currentMovie={currentMovie}
          selectedMoods={selectedMoods}
          swipeCount={swipeCount}
          userVector={userVector}
          availableCandidates={rankedCandidates.map(({ movie }) => movie)}
          lastSwipe={lastSwipe}
          onClose={() => setIsInspectorOpen(false)}
        />
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
