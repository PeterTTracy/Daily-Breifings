import { redirect } from 'next/navigation';

// Root entry point. The Portfolio roll-up is the home view of the ops platform.
// (The Daily Briefing is its own app now — see ../dailybriefingdeploy.)
export default function Home() {
  redirect('/portfolio');
}
