import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace — BioQuest',
  description: 'Edit and preview your VR experience',
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: '#fff' }}>
      {children}
    </div>
  );
}
