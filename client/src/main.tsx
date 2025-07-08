import React from 'react';
import { createRoot } from 'react-dom/client';
import SimpleApp from './SimpleApp';

const root = createRoot(document.getElementById('root')!);
root.render(<SimpleApp />);