import { redirect } from 'next/navigation';

// Root entry point. The Daily Briefing is the home view — the first thing Pete
// needs each morning. Once Azure AD SSO is enforced, the session check / sign-in
// redirect will live here.
export default function Home() {
  redirect('/my-day');
}
