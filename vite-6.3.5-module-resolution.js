
// Enhanced Module Resolution for Vite 6.3.5
export const moduleResolution = {
  alias: {
    '@': './client/src',
    '@shared': './shared',
    '@assets': './attached_assets',
    '@components': './client/src/components',
    '@lib': './client/src/lib',
    '@utils': './client/src/utils',
    '@pages': './client/src/pages',
    '@hooks': './client/src/hooks'
  },
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.vue'],
  conditions: ['import', 'module', 'browser', 'default'],
  dedupe: ['react', 'react-dom']
};

// Enhanced dependency optimization
export const optimizeDeps = {
  include: [
    'react',
    'react-dom',
    'react-dom/client',
    'wouter',
    '@tanstack/react-query',
    '@hookform/resolvers/zod',
    'react-hook-form',
    'zod',
    'clsx',
    'tailwind-merge',
    'date-fns',
    'lucide-react'
  ],
  exclude: ['@replit/vite-plugin-cartographer'],
  esbuildOptions: {
    target: 'es2020',
    jsx: 'automatic'
  }
};
