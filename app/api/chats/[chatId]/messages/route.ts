import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/chats/:chatId/messages - 메시지 목록 (폴링)
export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { chatId } = await params
    const userId = session.user.id

    const chat = await prisma.chat.findUnique({ where: { id: chatId } })
    if (!chat) {
      return NextResponse.json({ error: { code: "CHAT_NOT_FOUND", message: "채팅방을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (chat.ownerId !== userId && chat.borrowerId !== userId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const after = searchParams.get("after") // 마지막 메시지 ID 이후만 가져오기 (폴링용)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)

    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(after && { createdAt: { gt: new Date(after) } }),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, nickname: true, image: true } },
      },
    })

    return NextResponse.json({ data: messages })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}

// POST /api/chats/:chatId/messages - 메시지 전송
export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { chatId } = await params
    const userId = session.user.id
    const { content } = await req.json()

    if (typeof content !== "string" || content.trim().length === 0 || content.trim().length > 2000) {
      return NextResponse.json({ error: { code: "INVALID_CONTENT", message: "메시지 내용을 입력해주세요." } }, { status: 400 })
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } })
    if (!chat) {
      return NextResponse.json({ error: { code: "CHAT_NOT_FOUND", message: "채팅방을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (chat.ownerId !== userId && chat.borrowerId !== userId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: { chatId, senderId: userId, content: content.trim() },
        include: { sender: { select: { id: true, name: true, nickname: true, image: true } } },
      }),
      prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
    ])

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
