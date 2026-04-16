import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

// Admin Supabase client — server-side only
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),

        CredentialsProvider({
            name: "Email & Password",
            credentials: {
                email:    { label: "Email",    type: "email"    },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // Verify via Supabase Auth
                const { data, error } = await supabase.auth.signInWithPassword({
                    email:    credentials.email,
                    password: credentials.password,
                });

                if (error || !data.user) return null;

                return {
                    id:    data.user.id,
                    email: data.user.email ?? "",
                    name:  (data.user.user_metadata?.name as string) ?? data.user.email ?? "",
                };
            },
        }),
    ],

    secret: process.env.NEXTAUTH_SECRET,

    pages: {
        signIn: "/login",
    },

    session: {
        strategy: "jwt",
    },

    callbacks: {
        async jwt({ token, user, account }) {
            if (user) token.uid = user.id;

            // Check subscription status from Supabase
            if (token.email) {
                try {
                    const { data } = await supabase
                        .from("mw_subscribers")
                        .select("is_pro")
                        .eq("email", token.email)
                        .single();
                    token.isPro = data?.is_pro ?? false;
                } catch {
                    token.isPro = false;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                (session.user as any).uid   = token.uid;
                (session.user as any).isPro = token.isPro ?? false;
            }
            return session;
        },
    },
};
