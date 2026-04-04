import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BioQuest VR',
  description: 'Config-driven VR biology game runtime',
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
