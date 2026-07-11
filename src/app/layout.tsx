import type { Metadata } from 'next';

// Load the design-system base layer first, then the shell's font-role overrides.
// Both are imported through the JS module resolver rather than a CSS-relative
// `@import` inside styles.css: Turbopack miscomputes the base directory of a
// relative CSS `@import` when its inferred root equals the project directory
// (drops the `src/` segment), so the relative form fails to resolve under
// `next dev`. JS imports resolve correctly and identically across Turbopack and
// Storybook's Vite. See docs/frontend for the Tauri dev pipeline.
import '../design-system/styles/globals.css';
import '../styles.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Aideon',
  description: 'Aideon Desktop shell hosting Praxis workspaces.',
};

/**
 * Root document layout for the desktop renderer.
 *
 * Fonts are self-hosted via `@fontsource` (Geist, Geist Mono, Newsreader) and wired through
 * CSS variables in `src/styles.css` — no runtime font CDN, which suits the offline-first
 * desktop runtime.
 * @param root0 - Layout props.
 * @param root0.children - Child nodes.
 */
export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="font-sans"
      // next-themes applies the system class on the client; suppress to avoid SSR/CSR mismatch.
      // shadcn recommends this for Next App Router + system theme default.
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
