import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db) as ReturnType<typeof DrizzleAdapter>,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Auto-create profile for new users (OAuth sign-ups)
      const baseUsername = (user.name || user.email?.split("@")[0] || "trader")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 16);
      const username = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;
      await db.insert(userProfiles).values({
        userId: user.id,
        username,
        displayName: user.name || undefined,
        avatarUrl: user.image || undefined,
      }).onConflictDoNothing();
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Refresh profile data on sign-in or update
      if (trigger === "signIn" || trigger === "update" || user) {
        const userId = (token.id || user?.id) as string;
        if (userId) {
          const [profile] = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, userId))
            .limit(1);
          if (profile) {
            token.username = profile.username;
            token.rank = profile.rank;
          }
          const [dbUser] = await db
            .select({
              is2FAEnabled: users.is2FAEnabled,
              subscriptionTier: users.subscriptionTier,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          if (dbUser) {
            token.is2FAEnabled = dbUser.is2FAEnabled;
            token.subscriptionTier = dbUser.subscriptionTier;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const userExt = session.user as unknown as Record<string, unknown>;
        userExt.is2FAEnabled = token.is2FAEnabled;
        userExt.subscriptionTier = token.subscriptionTier;
        userExt.username = token.username;
        userExt.rank = token.rank;
      }
      return session;
    },
  },
});
