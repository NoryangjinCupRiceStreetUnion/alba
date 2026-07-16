import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/rentals/:rentalId/status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ rentalId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const { rentalId } = await params
    const { status: newStatus } = await req.json()
    const userId = session.user.id

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { item: true },
    })

    if (!rental) {
      return NextResponse.json({ error: { code: "RENTAL_NOT_FOUND", message: "대여를 찾을 수 없습니다." } }, { status: 404 })
    }

    const isOwner = rental.item.ownerId === userId
    const isBorrower = rental.borrowerId === userId

    if (!isOwner && !isBorrower) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 })
    }

    // 상태 변경 권한 검사
    const allowedTransitions: Record<string, { from: string; by: "owner" | "borrower" | "both" }> = {
      APPROVED: { from: "REQUESTED", by: "owner" },
      REJECTED: { from: "REQUESTED", by: "owner" },
      BORROWED: { from: "APPROVED", by: "owner" },
      RETURNED: { from: "BORROWED", by: "owner" },
      CANCELED: { from: "REQUESTED|APPROVED", by: "both" },
    }

    const transition = allowedTransitions[newStatus]
    if (!transition || !transition.from.split("|").includes(rental.status)) {
      return NextResponse.json({ error: { code: "INVALID_STATUS_CHANGE", message: "잘못된 상태 변경입니다." } }, { status: 409 })
    }
    if (transition.by === "owner" && !isOwner) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "물건 소유자만 가능합니다." } }, { status: 403 })
    }
    if (transition.by === "borrower" && !isBorrower) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "대여자만 가능합니다." } }, { status: 403 })
    }

    const updated = await prisma.rental.update({
      where: { id: rentalId },
      data: { status: newStatus as any },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } }, { status: 500 })
  }
}
