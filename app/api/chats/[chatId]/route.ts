import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/chats/:chatId - 채팅 상세 정보
export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { chatId } = await params
    const userId = session.user.id

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            images: { orderBy: { order: "asc" }, take: 1 },
          },
        },
        rental: {
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            totalPrice: true,
          },
        },
      },
    })

    if (!chat) {
      return NextResponse.json({ error: { code: "CHAT_NOT_FOUND", message: "채팅방을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (chat.ownerId !== userId && chat.borrowerId !== userId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    return NextResponse.json({ data: chat })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
