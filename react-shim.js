// React shim for proper bundling compatibility
import React from 'react';
import ReactDOM from 'react-dom/client';

// Ensure React is available globally
if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = ReactDOM;
}

export { React, ReactDOM };
export default React;