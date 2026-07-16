import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/items/:itemId
export async function GET(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        images: { orderBy: { order: "asc" } },
        owner: { select: { id: true, name: true, nickname: true, image: true, trustBattery: true } },
        rentals: {
          where: { status: { in: ["APPROVED", "BORROWED"] } },
          select: { startAt: true, endAt: true },
        },
      },
    })

    if (!item || item.status === "DEACTIVATED") {
      return NextResponse.json({ error: { code: "ITEM_NOT_FOUND", message: "물건을 찾을 수 없습니다." } }, { status: 404 })
    }

    return NextResponse.json({ data: item })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}

// PATCH /api/items/:itemId
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { itemId } = await params
    const item = await prisma.item.findUnique({ where: { id: itemId } })

    if (!item || item.status === "DEACTIVATED") {
      return NextResponse.json({ error: { code: "ITEM_NOT_FOUND", message: "물건을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (item.ownerId !== session.user.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    const body = await req.json()
    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.tradeMethod && { tradeMethod: body.tradeMethod }),
        ...(body.region && { region: body.region }),
        ...(body.dailyPrice !== undefined && { dailyPrice: body.dailyPrice }),
        ...(body.weeklyPrice !== undefined && { weeklyPrice: body.weeklyPrice }),
        ...(body.availableFrom && { availableFrom: new Date(body.availableFrom) }),
        ...(body.availableUntil && { availableUntil: new Date(body.availableUntil) }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}

// DELETE /api/items/:itemId - soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { itemId } = await params
    const item = await prisma.item.findUnique({ where: { id: itemId } })

    if (!item) {
      return NextResponse.json({ error: { code: "ITEM_NOT_FOUND", message: "물건을 찾을 수 없습니다." } }, { status: 404 })
    }
    if (item.ownerId !== session.user.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    await prisma.item.update({ where: { id: itemId }, data: { status: "DEACTIVATED" } })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
