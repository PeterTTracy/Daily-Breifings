'use client';
import { SessionProvider } from 'next-auth/react';

// Wraps the app so NextAuth session state is available to client components.
// Phase 0: no real provider is enforced yet (see app/api/auth/[...nextauth]).
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
