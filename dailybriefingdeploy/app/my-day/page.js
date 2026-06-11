import { redirect } from 'next/navigation';

// Legacy route: the briefing used to live at /my-day (and installed PWAs may
// still have it as their start_url). The briefing is the home page now.
export default function MyDay() {
  redirect('/');
}
