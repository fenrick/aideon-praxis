import type { Metadata } from 'next';

import '../src/styles.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Aideon',
  description: 'Aideon Desktop shell hosting Praxis workspaces.',
};

/**
 * Root document layout for the desktop renderer.
 *
 * Fonts are self-hosted via @fontsource (Geist, Geist Mono, Newsreader) and wired through
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
