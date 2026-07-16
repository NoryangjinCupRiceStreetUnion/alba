import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Kakao from "next-auth/providers/kakao"
import Naver from "next-auth/providers/naver"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
    }),
    Credentials({
      name: "TestAccount",
      credentials: {
        name: { label: "이름", type: "text" },
        email: { label: "이메일", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email as string
        const name = (credentials.name as string) || "테스트 유저"

        let user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              image: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
            },
          })
        }

        return user
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const profile = await prisma.user.findUnique({
          where: { id: user.id },
          select: { trustBattery: true },
        })
        token.trustBattery = profile?.trustBattery ?? 80
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.trustBattery = typeof token.trustBattery === "number" ? token.trustBattery : 80
      }
      return session
    },
  },
})
