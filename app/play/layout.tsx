import type { Metadata } from 'next';
import { PlayTopBar } from './components/PlayTopBar';

export const metadata: Metadata = {
  title: 'BioQuest VR',
  description: 'Config-driven VR biology game runtime',
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  // Cover the root layout's Navigation with a fixed fullscreen container.
  // This keeps the root layout untouched while making /play routes fully immersive.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: '#000' }}>
      <PlayTopBar />
      {children}
    </div>
  );
}
