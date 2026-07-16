import { dataResponse, errorResponse, internalError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Context = { params: Promise<{ userId: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    const { userId } = await params
    const [user, lentCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          nickname: true,
          image: true,
          trustBattery: true,
          createdAt: true,
          _count: {
            select: { items: true, rentals: true, reviewsReceived: true },
          },
        },
      }),
      prisma.rental.count({ where: { item: { ownerId: userId } } }),
    ])

    if (!user) {
      return errorResponse("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404)
    }

    const { _count, ...profile } = user
    return dataResponse({
      ...profile,
      itemCount: _count.items,
      borrowedCount: _count.rentals,
      lentCount,
      reviewCount: _count.reviewsReceived,
    })
  } catch (error) {
    return internalError(error)
  }
}
