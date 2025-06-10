import React, { useState, useCallback } from 'react';

const Schedule = () => {
  const [hoveredDate, setHoveredDate] = useState(null);

  const handleMouseEnter = useCallback((e, date) => {
    e.stopPropagation();
    e.preventDefault();
    setHoveredDate(date);
    console.log('Dropdown stabilized on ' + date);
  }, []); // Empty dependency array prevents re-render

  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  return (
    <div className="schedule-container">
      <div className="calendar-grid">
        {['10', '11', '12', '13', '14', '15', '16'].map(date => (
          <div
            key={date}
            className="calendar-day"
            onMouseEnter={(e) => handleMouseEnter(e, date)}
            onMouseLeave={handleMouseLeave}
          >
            {date}
            {date === '12' && hoveredDate === date && (
              <div className="auto-post-dropdown">
                <p>Auto-generated post for {date}</p>
                <button className="approve-button">approve and post</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;