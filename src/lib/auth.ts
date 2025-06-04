import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { HttpClient } from "./api/http-client";

// API URL for auth endpoints


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call our backend API for authentication using the centralized HTTP client
          const response = await HttpClient.post(
            "/auth/login",
            {
              email: credentials.email,
              password: credentials.password,
            },
            false,
          ); // false = no authentication required for login

          const data = await HttpClient.parseJsonResponse<{
            user: {
              id: string;
              email: string;
              role: string;
            };
          }>(response);

          // Return the user object if successful
          if (data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
            };
          }

          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user details to the JWT token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user details to the session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key",
};
