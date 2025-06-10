import React from 'react';

const Schedule = () => {
  const handleMouseOver = (e, date) => {
    if (e.target.classList.contains('auto-post')) {
      e.stopPropagation();
      console.log('Auto-post hover stabilized on ' + date);
      // Existing hover logic for auto-post-tooltip
    }
  };

  return (
    <div className="schedule-container">
      <div className="calendar-grid">
        {['10', '11', '12', '13', '14', '15', '16'].map(date => (
          <div
            key={date}
            className={date === '12' ? 'auto-post date-cell' : 'date-cell'} // Simulate auto-generated post on date 12
            onMouseOver={(e) => handleMouseOver(e, date)}
          >
            {date}
            {date === '12' && <div className="auto-post-tooltip">Auto-generated post for {date}</div>}
            <button className="approve-button">approve and post</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;