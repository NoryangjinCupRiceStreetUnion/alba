import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { redirect } from "next/navigation"



const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session) {
    // 로그인이 안 되어 있으면 로그인 페이지로 리다이렉트
    redirect("/api/auth/signin?callbackUrl=/")
  }
  // const session = await getServerSession(authOptions)
  const posts = await prisma.post.findMany({
    orderBy: [
      { order: "asc" },
      { id: "asc" },
    ],
  })

  // determine which posts the signed-in user has watched
  let watchedIds = new Set<number>()
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { watchedPosts: true },
    })
    watchedIds = new Set((user?.watchedPosts ?? []).map((p: any) => p.id))
  }

  return (
    <div className="min-h-svh p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">강의 목록</h1>

        <Field className="w-full pt-5 px-1">
          {(() => {
            const total = posts.length
            const completed = watchedIds.size
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0
            return (
              <>
                <FieldLabel htmlFor="progress-upload">
                  <span>전체 수강률</span>
                  <span className="ml-auto">{percent}% · {completed}/{total}</span>
                </FieldLabel>
                <Progress value={percent} id="progress-upload" />
              </>
            )
          })()}
        </Field>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-base text-slate-700">
          저장된 강의가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={`/study/${post.id}`}
              className="bg-card text-card-foreground rounded-lg border border-border p-4 shadow-sm rounded-xs transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="text-lg font-medium">{post.title}</div>
              <div className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {post.content?.slice(0, 160) ?? "요약 정보가 없습니다."}
              </div>
              <div className="mt-3">
                {watchedIds.has(post.id) ? (
                  <span className="rounded-full bg-emerald-600 px-2 py-1 text-white text-xs">완료</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
