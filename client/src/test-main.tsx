import React from 'react';
import { createRoot } from "react-dom/client";

// Make React available globally for JSX transformation
(window as any).React = React;

function TestApp() {
  return <div>React is working!</div>;
}

createRoot(document.getElementById("root")!).render(<TestApp />);