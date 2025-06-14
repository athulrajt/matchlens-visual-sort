
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css' // This already imports tailwind base, components, utilities

createRoot(document.getElementById("root")!).render(<App />);
