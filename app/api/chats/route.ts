import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/chats - 내 채팅 목록
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const userId = session.user.id

    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ ownerId: userId }, { borrowerId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            images: { orderBy: { order: "asc" }, take: 1 },
          },
        },
        rental: { select: { status: true, startAt: true, endAt: true, totalPrice: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true, nickname: true } } },
        },
      },
    })

    return NextResponse.json({ data: chats })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
