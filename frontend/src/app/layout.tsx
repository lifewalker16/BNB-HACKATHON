import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@xyflow/react/dist/style.css';

export const metadata: Metadata = {
  title: 'RadarDev — SkillBridge AI',
  description:
    'Adaptive career roadmaps grounded in real developer community discussions. Bridge your skill gap with evidence-backed learning paths.',
  keywords: ['career roadmap', 'ATS resume', 'skill gap', 'developer jobs', 'SkillBridge'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
