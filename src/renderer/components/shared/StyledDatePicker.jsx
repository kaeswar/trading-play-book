import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function StyledDatePicker({ value, onChange, highlightDates = [], placeholderText }) {
  // Convert date string "YYYY-MM-DD" to Date object
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Convert highlight date strings to Date objects
  const highlighted = highlightDates.map((d) => new Date(d + 'T00:00:00'));

  const handleChange = (date) => {
    if (date) {
      // Convert back to "YYYY-MM-DD" format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  return (
    <div className="styled-datepicker-wrapper">
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        highlightDates={highlighted}
        placeholderText={placeholderText || 'Select date'}
        dateFormat="yyyy-MM-dd"
        calendarClassName="dark-datepicker"
        popperClassName="dark-datepicker-popper"
        showPopperArrow={false}
      />
    </div>
  );
}
