import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const SWIPE_THRESHOLD = 120;
const UP_THRESHOLD = 100;

function MovieCard({ movie, onSwipe }) {
  const [exitDirection, setExitDirection] = useState(null);
  const cardRef = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Slight rotation when dragging horizontally
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);

  // Opacity for directional labels
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40, 0], [1, 0.3, 0]);
  const rightOpacity = useTransform(x, [0, 40, SWIPE_THRESHOLD], [0, 0.3, 1]);
  const upOpacity = useTransform(y, [0, -40, -UP_THRESHOLD], [0, 0.3, 1]);

  if (!movie) return null;

  const triggerSwipe = (direction) => {
    setExitDirection(direction);

    const exitX = direction === 'left' ? -600 : direction === 'right' ? 600 : 0;
    const exitY = direction === 'up' ? -600 : 0;

    animate(x, exitX, { duration: 0.35, ease: 'easeOut' });
    animate(y, exitY, {
      duration: 0.35,
      ease: 'easeOut',
      onComplete: () => {
        onSwipe(direction);
        // Reset for next card
        x.set(0);
        y.set(0);
        setExitDirection(null);
      },
    });
  };

  const handleDragEnd = (_event, info) => {
    const { offset } = info;

    // Check vertical first — up swipe takes priority if dominant
    if (offset.y < -UP_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) {
      triggerSwipe('up');
      return;
    }

    if (offset.x < -SWIPE_THRESHOLD) {
      triggerSwipe('left');
      return;
    }

    if (offset.x > SWIPE_THRESHOLD) {
      triggerSwipe('right');
      return;
    }

    // Below threshold — snap back
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="movie-card"
      style={{ x, y, rotate, cursor: 'grab' }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* Directional overlay labels */}
      <motion.div className="swipe-label swipe-label-left" style={{ opacity: leftOpacity }}>
        PASS
      </motion.div>
      <motion.div className="swipe-label swipe-label-right" style={{ opacity: rightOpacity }}>
        LIKE
      </motion.div>
      <motion.div className="swipe-label swipe-label-up" style={{ opacity: upOpacity }}>
        WATCHLIST
      </motion.div>

      {movie.poster && (
        <div className="movie-card-poster">
          <img src={movie.poster} alt={movie.title} draggable="false" />
          <div className="movie-card-rating">{movie.rating}</div>
        </div>
      )}
      <div className="movie-card-info">
        <div className="movie-card-header">
          <h3 className="movie-card-title">{movie.title}</h3>
          <span className="movie-card-year">{movie.year}</span>
        </div>
        <p className="movie-card-overview">{movie.overview}</p>
        <div className="movie-card-tags">
          {movie.genres?.map((genre) => (
            <span key={genre} className="movie-tag genre-tag">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export { MovieCard as default, SWIPE_THRESHOLD, UP_THRESHOLD };
