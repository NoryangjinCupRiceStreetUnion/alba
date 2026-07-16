import { auth } from "@/auth"
import { dataResponse, errorResponse, internalError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Context = { params: Promise<{ rentalId: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    const { rentalId } = await params
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        item: {
          include: {
            images: { orderBy: { order: "asc" } },
            owner: {
              select: {
                id: true,
                name: true,
                nickname: true,
                image: true,
                trustBattery: true,
              },
            },
          },
        },
        borrower: {
          select: {
            id: true,
            name: true,
            nickname: true,
            image: true,
            trustBattery: true,
          },
        },
        reviews: {
          select: {
            id: true,
            authorId: true,
            targetUserId: true,
            rating: true,
            content: true,
            createdAt: true,
          },
        },
      },
    })

    if (!rental) {
      return errorResponse(
        "RENTAL_NOT_FOUND",
        "대여 내역을 찾을 수 없습니다.",
        404
      )
    }
    if (rental.borrowerId !== userId && rental.item.ownerId !== userId) {
      return errorResponse(
        "FORBIDDEN",
        "거래 당사자만 조회할 수 있습니다.",
        403
      )
    }

    return dataResponse(rental)
  } catch (error) {
    return internalError(error)
  }
}
