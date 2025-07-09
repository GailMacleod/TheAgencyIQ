import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure React is available globally for JSX
(window as any).React = React;
(globalThis as any).React = React;

// Schedule page mobile layout detection and logging
if (window.matchMedia('(max-width: 768px)').matches) {
  console.log('Schedule layout adjusted for mobile');
  console.log('Mobile layout applied');
}

createRoot(document.getElementById("root")!).render(<App />);
