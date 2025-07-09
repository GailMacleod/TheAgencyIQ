import "./react-setup.js";
import { React, createRoot } from "./react-setup.js";
import App from "./App";
import "./index.css";

// Schedule page mobile layout detection and logging
if (window.matchMedia('(max-width: 768px)').matches) {
  console.log('Schedule layout adjusted for mobile');
  console.log('Mobile layout applied');
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found");
}
