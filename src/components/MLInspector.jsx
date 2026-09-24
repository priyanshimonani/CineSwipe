import { useMemo } from 'react';
import { cosineSimilarity } from '../ml/cosineSimilarity';
import { scoreCandidates } from '../ml/scoreCandidates';
import { movieToVector, FEATURE_ORDER } from '../ml/vectorize';

function formatFeatureName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function VectorTable({ vector, changedIndexes = new Set() }) {
  return (
    <div className="ml-inspector-vector-table">
      {FEATURE_ORDER.map((feature, index) => (
        <div
          className={`ml-inspector-vector-row${changedIndexes.has(index) ? ' is-changed' : ''}`}
          key={feature}
        >
          <span>{formatFeatureName(feature)}</span>
          <span>{formatValue(vector[index] || 0)}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureBars({ features, group }) {
  return (
    <div className="ml-inspector-feature-list">
      {Object.entries(features?.[group] || {}).map(([feature, value]) => (
        <div className="ml-inspector-feature-row" key={feature}>
          <div className="ml-inspector-feature-label">
            <span>{formatFeatureName(feature)}</span>
            <span>{formatValue(value)}</span>
          </div>
          <div className="ml-inspector-bar">
            <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateRanking({ title, candidates }) {
  return (
    <div className="ml-inspector-ranking">
      <h4>{title}</h4>
      {candidates.length === 0 ? (
        <p className="ml-inspector-muted">No candidates available.</p>
      ) : (
        <ol>
          {candidates.slice(0, 5).map(({ movie, score }) => (
            <li key={movie.id}>
              <span>{movie.title}</span>
              <strong>{score.toFixed(3)}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RankingChange({ before, after }) {
  const beforePositions = new Map(before.map(({ movie }, index) => [movie.id, index]));
  const afterPositions = new Map(after.map(({ movie }, index) => [movie.id, index]));
  const changedMovies = after
    .filter(({ movie }) => beforePositions.has(movie.id))
    .map(({ movie }) => ({
      movie,
      movement: beforePositions.get(movie.id) - afterPositions.get(movie.id),
    }))
    .filter(({ movement }) => movement !== 0)
    .slice(0, 5);

  return (
    <div className="ml-inspector-ranking-change">
      <h4>Ranking change</h4>
      {changedMovies.length === 0 ? (
        <p className="ml-inspector-muted">No position changes in the visible ranking.</p>
      ) : (
        <ul>
          {changedMovies.map(({ movie, movement }) => (
            <li key={movie.id}>
              <span>{movie.title}</span>
              <strong className={movement > 0 ? 'moved-up' : 'moved-down'}>
                {movement > 0 ? `Up ${movement}` : `Down ${Math.abs(movement)}`}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MLInspector({
  currentMovie,
  selectedMoods,
  swipeCount,
  userVector,
  availableCandidates,
  lastSwipe,
  onClose,
}) {
  const movieVector = useMemo(
    () => (currentMovie ? movieToVector(currentMovie) : []),
    [currentMovie]
  );
  const currentSimilarity = currentMovie
    ? cosineSimilarity(userVector, movieVector)
    : 0;
  const currentRanking = scoreCandidates(userVector, availableCandidates);
  const changedIndexes = new Set();

  if (lastSwipe?.beforeVector && lastSwipe.afterVector) {
    FEATURE_ORDER.forEach((feature, index) => {
      if (lastSwipe.beforeVector[index] !== lastSwipe.afterVector[index]) {
        changedIndexes.add(index);
      }
    });
  }

  return (
    <aside className="ml-inspector" aria-label="ML Inspector">
      <div className="ml-inspector-header">
        <div>
          <p className="ml-inspector-eyebrow">Development tool</p>
          <h2>ML Inspector</h2>
        </div>
        <button className="ml-inspector-close" onClick={onClose} type="button">
          Close
        </button>
      </div>

      <section className="ml-inspector-section">
        <h3>Current movie</h3>
        {currentMovie ? (
          <>
            <div className="ml-inspector-movie-heading">
              <strong>{currentMovie.title}</strong>
              <span>ID: {currentMovie.id}</span>
            </div>
            <p className="ml-inspector-meta">
              Swipe {swipeCount + 1} / 10 · {selectedMoods.join(', ')}
            </p>
            <p className="ml-inspector-overview">{currentMovie.overview || 'No overview available.'}</p>
            <p className="ml-inspector-meta">
              Genres: {(currentMovie.genres || []).join(', ') || 'None'}
            </p>
          </>
        ) : (
          <p className="ml-inspector-muted">No current movie.</p>
        )}
      </section>

      {currentMovie && (
        <>
          <section className="ml-inspector-section">
            <h3>Feature engineering</h3>
            <h4>Genres</h4>
            <FeatureBars features={currentMovie.features} group="genres" />
            <h4>Moods</h4>
            <FeatureBars features={currentMovie.features} group="moods" />
          </section>

          <section className="ml-inspector-section">
            <h3>20D movie vector</h3>
            <VectorTable vector={movieVector} />
          </section>

          <section className="ml-inspector-section">
            <h3>Current user vector</h3>
            <VectorTable vector={userVector} />
          </section>

          <section className="ml-inspector-section">
            <h3>Cosine similarity</h3>
            <p className="ml-inspector-score">{currentSimilarity.toFixed(3)}</p>
            <CandidateRanking title="Top 5 available candidates" candidates={currentRanking} />
          </section>
        </>
      )}

      <section className="ml-inspector-section">
        <h3>Swipe effect</h3>
        {lastSwipe ? (
          <>
            <p className="ml-inspector-action">{lastSwipe.action === 'up' ? "UP / HAVEN'T SEEN" : lastSwipe.action.toUpperCase()}</p>
            {lastSwipe.action === 'up' ? (
              <p className="ml-inspector-muted">User vector unchanged.</p>
            ) : (
              <>
                <div className="ml-inspector-changes">
                  {FEATURE_ORDER.map((feature, index) => {
                    if (!changedIndexes.has(index)) return null;
                    return (
                      <div className="ml-inspector-change-row" key={feature}>
                        <span>{formatFeatureName(feature)}</span>
                        <strong>
                          {formatValue(lastSwipe.beforeVector[index])}
                          {' → '}
                          {formatValue(lastSwipe.afterVector[index])}
                        </strong>
                      </div>
                    );
                  })}
                </div>
                <VectorTable vector={lastSwipe.afterVector} changedIndexes={changedIndexes} />
              </>
            )}
          </>
        ) : (
          <p className="ml-inspector-muted">Swipe a movie to inspect the vector update.</p>
        )}
      </section>

      {lastSwipe && (
        <section className="ml-inspector-section">
          <h3>Ranking before and after swipe</h3>
          <div className="ml-inspector-ranking-grid">
            <CandidateRanking title="Before" candidates={lastSwipe.beforeRanking} />
            <CandidateRanking title="After" candidates={lastSwipe.afterRanking} />
          </div>
          <RankingChange before={lastSwipe.beforeRanking} after={lastSwipe.afterRanking} />
        </section>
      )}
    </aside>
  );
}
