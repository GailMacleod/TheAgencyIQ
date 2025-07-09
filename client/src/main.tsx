import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make React available globally for JSX transformation
(window as any).React = React;

// Schedule page mobile layout detection and logging
if (window.matchMedia('(max-width: 768px)').matches) {
  console.log('Schedule layout adjusted for mobile');
  console.log('Mobile layout applied');
}

const root = createRoot(document.getElementById("root")!);
root.render(React.createElement(App));
