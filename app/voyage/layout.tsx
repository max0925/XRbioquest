import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voyage Inside the Cell | BioQuest VR',
  description: 'Explore the microscopic world inside a living cell in immersive VR. An interactive 5-phase educational game.',
};

export default function VoyageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
