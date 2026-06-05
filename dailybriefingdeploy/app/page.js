import { redirect } from 'next/navigation';

// Root entry point. Phase 0/1: the auth gate is a pass-through stub, so we route
// straight to the default view (Portfolio). Once Azure AD SSO is enforced this
// is where the session check / sign-in redirect will live.
export default function Home() {
  redirect('/portfolio');
}
