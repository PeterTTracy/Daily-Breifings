/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode is driven by a `.dark` class on <html> (toggled by ThemeToggle,
  // set pre-paint by the no-flash script in app/layout.js).
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Semantic colors are backed by CSS variables defined in app/globals.css.
      // The same class (e.g. bg-surface) resolves to the light or dark value
      // depending on the `.dark` class — no per-component dark: variants needed.
      colors: {
        pagebg: 'var(--pagebg)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        heading: 'var(--heading)',
        accent: 'var(--accent)',
        completed: 'var(--completed)',
        subtle: 'var(--subtle)',
        subtletext: 'var(--subtletext)',
        highlight: 'var(--highlight)',
      },
      maxWidth: {
        content: '680px',
      },
    },
  },
  plugins: [],
};
