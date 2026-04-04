import { redirect } from 'next/navigation';

// /play → redirect to the default experience
export default function PlayIndexPage() {
  redirect('/play/voyage-inside-cell');
}
