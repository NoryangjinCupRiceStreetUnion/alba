import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, RentalStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

// POST /api/rentals - 대여 요청
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const body = await req.json()
    const { itemId, startAt, endAt } = body

    if (!itemId || !startAt || !endAt) {
      return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "필수 필드가 없습니다." } }, { status: 400 })
    }

    const start = new Date(startAt)
    const end = new Date(endAt)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: { code: "INVALID_DATES", message: "종료일이 시작일보다 늦어야 합니다." } }, { status: 400 })
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } })

    if (!item || item.status === "DEACTIVATED") {
      return NextResponse.json({ error: { code: "ITEM_NOT_FOUND", message: "물건을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (item.ownerId === session.user.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "본인 물건은 대여할 수 없습니다." } }, { status: 403 })
    }
    if (start < item.availableFrom || end > item.availableUntil) {
      return NextResponse.json({ error: { code: "OUTSIDE_AVAILABILITY", message: "등록된 대여 가능 기간 안에서 선택해주세요." } }, { status: 409 })
    }

    // 기간 중복 검사
    const conflict = await prisma.rental.findFirst({
      where: {
        itemId,
        status: { in: ["APPROVED", "BORROWED"] },
        OR: [{ startAt: { lt: end }, endAt: { gt: start } }],
      },
    })

    if (conflict) {
      return NextResponse.json({ error: { code: "RENTAL_PERIOD_CONFLICT", message: "해당 기간에 이미 대여가 있습니다." } }, { status: 409 })
    }

    // 금액 서버 계산
    const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
    const days = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1
    let totalPrice = days * item.dailyPrice
    if (item.weeklyPrice && days >= 7) {
      const weeks = Math.floor(days / 7)
      const remaining = days % 7
      totalPrice = weeks * item.weeklyPrice + remaining * item.dailyPrice
    }

    const { rental, chat } = await prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          itemId,
          borrowerId: session.user.id,
          startAt: start,
          endAt: end,
          totalPrice,
        },
      })

      const chat = await tx.chat.create({
        data: {
          itemId,
          rentalId: rental.id,
          ownerId: item.ownerId,
          borrowerId: session.user.id,
        },
      })

      return { rental, chat }
    })

    return NextResponse.json({ data: rental, chatId: chat.id }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}

// GET /api/rentals - 내 대여 목록
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const role = (searchParams.get("role") as "borrower" | "owner") ?? "borrower"
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor") ?? undefined
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)

    if (status && !Object.values(RentalStatus).includes(status as RentalStatus)) {
      return NextResponse.json({ error: { code: "INVALID_STATUS", message: "지원하지 않는 대여 상태입니다." } }, { status: 400 })
    }

    const where: Prisma.RentalWhereInput = {
      ...(role === "borrower"
        ? { borrowerId: session.user.id }
        : { item: { ownerId: session.user.id } }),
      ...(status && { status: status as RentalStatus }),
    }

    const rentals = await prisma.rental.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        item: {
          include: {
            images: { orderBy: { order: "asc" }, take: 1 },
            owner: { select: { id: true, name: true, nickname: true, image: true } },
          },
        },
      },
    })

    const hasNext = rentals.length > limit
    const data = rentals.slice(0, limit)

    return NextResponse.json({ data, nextCursor: hasNext ? data[data.length - 1]?.id : null, hasNext })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
