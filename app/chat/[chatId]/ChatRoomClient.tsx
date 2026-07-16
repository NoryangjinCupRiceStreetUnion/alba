"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"
import { io, Socket } from "socket.io-client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

type Message = {
  id: string
  content: string
  senderId: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    nickname: string | null
    image: string | null
  }
}

type ChatInfo = {
  id: string
  itemId: string
  ownerId: string
  borrowerId: string
  item: { id: string; name: string; images: { url: string }[] }
  rental: {
    id: string
    status: string
    startAt: string
    endAt: string
    totalPrice: number
  } | null
}

const RENTAL_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  REQUESTED: { label: "신청중", variant: "secondary" },
  APPROVED: { label: "승인됨", variant: "default" },
  REJECTED: { label: "거절됨", variant: "destructive" },
  BORROWED: { label: "대여중", variant: "default" },
  RETURNED: { label: "반납완료", variant: "outline" },
  CANCELED: { label: "취소됨", variant: "outline" },
}

export default function ChatRoomClient({ chatId }: { chatId: string }) {
  const { data: session } = useSession()
  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // 채팅 정보 로드
  useEffect(() => {
    async function loadChat() {
      try {
        const res = await fetch(`/api/chats/${chatId}`)
        if (res.ok) {
          const { data } = await res.json()
          setChat(data)
        }
      } catch {}
    }
    loadChat()
  }, [chatId])

  // 초기 메시지 로드
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`)
        if (res.ok) {
          const { data } = await res.json()
          setMessages(data ?? [])
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    loadMessages()
  }, [chatId])

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] })
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("join-chat", chatId)
    })

    socket.on("new-message", (message: Message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
    })

    return () => {
      socket.emit("leave-chat", chatId)
      socket.disconnect()
      socketRef.current = null
    }
  }, [chatId])

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      })

      if (!res.ok) {
        throw new Error("send failed")
      }

      const { data } = await res.json()
      setMessages((prev) => {
        if (prev.some((item) => item.id === data.id)) {
          return prev
        }
        return [...prev, data]
      })
      setInput("")

      socketRef.current?.emit("send-message", { chatId, message: data })
    } catch {
      toast.error("메시지 전송에 실패했습니다.")
    } finally {
      setSending(false)
    }
  }

  // 대여 상태 변경
  async function changeRentalStatus(status: string) {
    if (!chat?.rental?.id) return
    try {
      const res = await fetch(`/api/rentals/${chat.rental.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(`상태가 "${RENTAL_STATUS_LABELS[status]?.label}"(으)로 변경됐습니다.`)
        setChat((prev) =>
          prev ? { ...prev, rental: prev.rental ? { ...prev.rental, status } : null } : prev
        )
      } else {
        const err = await res.json()
        toast.error(err?.error?.message ?? "오류가 발생했습니다.")
      }
    } catch {
      toast.error("오류가 발생했습니다.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const myId = session?.user?.id
  const isOwner = chat?.ownerId === myId
  const myRole = isOwner ? "판매자" : "구매자"
  const partnerRole = isOwner ? "구매자" : "판매자"
  const rentalStatus = chat?.rental?.status
  const statusInfo = rentalStatus ? RENTAL_STATUS_LABELS[rentalStatus] : null
  const thumbnail = chat?.item?.images?.[0]?.url

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 min-h-screen flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/chat">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {thumbnail && (
            <img src={thumbnail} alt="" className="h-10 w-10 rounded-xl object-cover border border-border/40 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{chat?.item?.name ?? "채팅방"}</p>
            <p className="text-xs text-muted-foreground">{myRole} · {partnerRole}와 대화 중</p>
          </div>
        </div>
        {statusInfo && (
          <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
            {statusInfo.label}
          </Badge>
        )}
      </div>

      <Separator />

      {/* 대여 정보 + 상태 변경 버튼 */}
      {chat?.rental && (
        <Card className="rounded-2xl border border-border/40 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>대여 기간</span>
                <span className="font-semibold text-foreground">
                  {new Date(chat.rental.startAt).toLocaleDateString()} ~{" "}
                  {new Date(chat.rental.endAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>총 금액</span>
                <span className="font-semibold text-foreground">
                  {chat.rental.totalPrice.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 소유자 버튼 */}
            {isOwner && rentalStatus === "REQUESTED" && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1 rounded-xl"
                  onClick={() => changeRentalStatus("APPROVED")}
                >
                  대여 승인
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={() => changeRentalStatus("REJECTED")}
                >
                  거절
                </Button>
              </div>
            )}
            {isOwner && rentalStatus === "APPROVED" && (
              <Button size="sm" className="w-full mt-4 rounded-xl" onClick={() => changeRentalStatus("BORROWED")}>
                대여 시작 확인
              </Button>
            )}
            {isOwner && rentalStatus === "BORROWED" && (
              <Button size="sm" className="w-full mt-4 rounded-xl" onClick={() => changeRentalStatus("RETURNED")}>
                반납 완료 처리
              </Button>
            )}
            {/* 대여자 버튼 */}
            {!isOwner && (rentalStatus === "REQUESTED" || rentalStatus === "APPROVED") && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-4 rounded-xl"
                onClick={() => changeRentalStatus("CANCELED")}
              >
                대여 취소
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 h-[50vh] rounded-2xl border border-border/40 bg-card/30 p-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              첫 메시지를 보내 대화를 시작해보세요!
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === myId
            const senderName = msg.sender?.nickname || msg.sender?.name || "상대방"

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMine && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={msg.sender?.image ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {senderName[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col gap-1 max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                  {!isMine && (
                    <span className="text-[10px] text-muted-foreground font-semibold pl-1">{senderName}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-accent text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-muted-foreground px-1">
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 입력창 */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 rounded-xl bg-background"
          disabled={sending}
        />
        <Button
          aria-label="메시지 보내기"
          type="submit"
          size="icon"
          className="rounded-xl shrink-0"
          disabled={!input.trim() || sending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
