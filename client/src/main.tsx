import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error handling for React mounting
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log("🚀 Starting React app mount...");
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("✅ React app mounted successfully");
} catch (error) {
  console.error("❌ React app mount failed:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Loading Error</h1>
      <p>React app failed to mount: ${error.message}</p>
      <p>Please refresh the page or contact support.</p>
    </div>
  `;
}
