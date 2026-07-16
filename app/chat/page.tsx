import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ChatSummary {
  id: string
  ownerId: string
  item?: { name?: string; images?: { url: string }[] }
  rental?: { status?: string }
  messages?: { content: string; sender?: { name?: string | null; nickname?: string | null } }[]
}

async function getChats(): Promise<ChatSummary[]> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/chats`, { cache: "no-store" })
  if (!res.ok) return []
  const { data } = await res.json()
  return data ?? []
}

const RENTAL_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  REQUESTED: { label: "신청중", variant: "secondary" },
  APPROVED: { label: "승인됨", variant: "default" },
  REJECTED: { label: "거절됨", variant: "destructive" },
  BORROWED: { label: "대여중", variant: "default" },
  RETURNED: { label: "반납완료", variant: "outline" },
  CANCELED: { label: "취소됨", variant: "outline" },
}

export default async function ChatListPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const chats = await getChats()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-black tracking-tight">채팅</h1>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">아직 채팅이 없습니다.</p>
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            물건 탐색하러 가기 →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {chats.map((chat, i) => {
            const lastMsg = chat.messages?.[0]
            const thumbnail = chat.item?.images?.[0]?.url
            const isOwner = chat.ownerId === session.user?.id
            const otherRole = isOwner ? "구매자" : "판매자"
            const rentalStatus = chat.rental?.status
            const statusInfo = rentalStatus ? RENTAL_STATUS_LABELS[rentalStatus] : null

            return (
              <div key={chat.id}>
                {i > 0 && <Separator className="my-1" />}
                <Link href={`/chat/${chat.id}`}>
                  <Card className="border-0 shadow-none hover:bg-accent/40 transition-colors cursor-pointer rounded-2xl">
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* 물건 썸네일 */}
                      <div className="relative shrink-0">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={chat.item?.name}
                            className="h-14 w-14 rounded-xl object-cover border border-border/40"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center">
                            <MessageCircle className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold truncate">{chat.item?.name ?? "물건 없음"}</span>
                          {statusInfo && (
                            <Badge variant={statusInfo.variant} className="shrink-0 text-[10px] px-2 py-0.5">
                              {statusInfo.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{otherRole}</p>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            <span className="font-semibold text-foreground/70">
                              {lastMsg.sender?.nickname || lastMsg.sender?.name || "상대방"}:
                            </span>{" "}
                            {lastMsg.content}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
