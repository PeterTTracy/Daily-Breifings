import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth';

// App Router route handlers may only export HTTP method handlers, so the config
// lives in lib/auth.js and we export just GET/POST here.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
