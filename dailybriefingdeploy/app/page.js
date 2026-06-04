import { redirect } from 'next/navigation';

// Root entry point. Phase 0: the auth gate is a pass-through stub, so we simply
// route to the default view. Once Azure AD SSO is enforced this is where the
// session check / sign-in redirect will live, and the default view will become
// /portfolio.
export default function Home() {
  redirect('/my-day');
}
