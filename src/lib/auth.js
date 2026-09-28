import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import List from '@/models/List';

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers = [
  CredentialsProvider({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || '').toLowerCase().trim();
      const password = String(credentials?.password || '');
      if (!email || !password) return null;

      await dbConnect();
      const user = await User.findOne({ email }).select('+password');
      if (!user || !user.password) return null; // Google-only accounts have no password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return null;

      return { id: user._id.toString(), name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

/** @type {import('next-auth').NextAuthOptions} */
export const authOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user?.email) return false;
        await dbConnect();
        const email = user.email.toLowerCase();
        const existing = await User.findOne({ email });
        if (!existing) {
          const created = await User.create({ name: user.name, email, image: user.image, provider: 'google' });
          await List.insertMany([
            { name: 'Personal', icon: '🏠', color: '#8b5cf6', owner: created._id },
            { name: 'Work', icon: '💼', color: '#3b82f6', owner: created._id },
            { name: 'Shopping', icon: '🛒', color: '#10b981', owner: created._id },
          ]);
        } else if (!existing.image && user.image) {
          existing.image = user.image;
          await existing.save();
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // First sign-in: attach our MongoDB user id to the token
      if (account?.provider === 'google' || (user && !token.uid)) {
        if (account?.provider === 'google') {
          await dbConnect();
          const dbUser = await User.findOne({ email: token.email?.toLowerCase() }).lean();
          if (dbUser) {
            token.uid = dbUser._id.toString();
            token.name = dbUser.name;
            token.picture = dbUser.image;
          }
        } else if (user) {
          token.uid = user.id;
        }
      }
      // Allow the client to refresh name/avatar after editing the profile
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    },
  },
};
