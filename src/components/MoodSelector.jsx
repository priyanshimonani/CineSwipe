import { moodOptions, genreOptions } from '../data/moods';

function MoodSelector({ selectedIds, onToggleOption, errorMsg, onContinue }) {
  return (
    <div className="content-wrapper selection-wrapper">
      <h2 className="selection-title">What are you in the mood for?</h2>

      <div className="options-container">
        <div className="options-section">
          <h3 className="section-label">MOOD</h3>
          <div className="options-grid">
            {moodOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={`option-chip ${selectedIds.includes(option.id) ? 'selected' : ''}`}
                onClick={() => onToggleOption(option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>

        <div className="options-section">
          <h3 className="section-label">GENRE / EXPERIENCE</h3>
          <div className="options-grid">
            {genreOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={`option-chip ${selectedIds.includes(option.id) ? 'selected' : ''}`}
                onClick={() => onToggleOption(option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="action-footer">
        <div className="message-container">
          {errorMsg ? (
            <p className="error-message">{errorMsg}</p>
          ) : (
            <p className="status-message">
              {selectedIds.length === 0 ? 'Select up to 3' : `${selectedIds.length}/3 selected`}
            </p>
          )}
        </div>
        <button
          className="primary-btn continue-btn"
          onClick={onContinue}
          disabled={selectedIds.length === 0}
          type="button"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default MoodSelector;
