import CredentialsProvider from 'next-auth/providers/credentials';

// Phase 0 placeholder auth options. Kept in lib/ (not in the route file) so that
// route handlers can export only GET/POST, and server code can import these
// options for getServerSession() later.
//
// The real provider will be Azure AD (Entra) once the app registration exists:
//
//   import AzureADProvider from 'next-auth/providers/azure-ad';
//   AzureADProvider({
//     clientId: process.env.AZURE_AD_CLIENT_ID,
//     clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
//     tenantId: process.env.AZURE_AD_TENANT_ID,
//   })
//
// Until then a Credentials provider keeps the NextAuth structure exercisable
// without locking anyone out of the live dashboard.
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Placeholder',
      credentials: {
        email: { label: 'Email', type: 'text' },
      },
      async authorize() {
        // Disabled until Azure AD SSO is wired up. Returning null prevents anyone
        // from minting a session via this placeholder provider (was: accept any
        // email — an auth-bypass once sessions are enforced). See security review.
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  // Set NEXTAUTH_SECRET in Vercel for production. The fallback only exists so
  // Phase 0 builds/deploys don't fail before the secret is configured.
  secret: process.env.NEXTAUTH_SECRET || 'phase0-placeholder-secret-change-me',
};
