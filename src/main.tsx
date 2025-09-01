
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add Inter font with all weights
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
