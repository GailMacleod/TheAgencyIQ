import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index.js";

// Prevent React development warnings from appearing in console
const suppressReactWarnings = () => {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ') ||
       args[0].includes('React') ||
       args[0].includes('ReactDOM') ||
       args[0].includes('componentWillMount') ||
       args[0].includes('componentWillReceiveProps'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ') ||
       args[0].includes('React') ||
       args[0].includes('ReactDOM'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
};

suppressReactWarnings();

createRoot(document.getElementById("root")!).render(<App />);
