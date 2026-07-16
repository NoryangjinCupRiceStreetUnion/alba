import { ItemStatus } from "@prisma/client"

import { errorResponse, internalError } from "@/lib/api"
import { startOfUtcDay } from "@/lib/marketplace"
import { prisma } from "@/lib/prisma"

const PERIOD_DAYS = { "1d": 1, "7d": 7, "30d": 30 } as const

function addUtcDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

function scoreMetric(metric: {
  viewCount: number
  rentalRequestCount: number
  rentalApprovedCount: number
}) {
  return (
    metric.viewCount +
    metric.rentalRequestCount * 5 +
    metric.rentalApprovedCount * 10
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") ?? "7d"
    const region = searchParams.get("region")?.trim()
    const limitText = searchParams.get("limit")
    const limit = limitText === null ? 10 : Number(limitText)

    if (!(period in PERIOD_DAYS)) {
      return errorResponse(
        "INVALID_PERIOD",
        "period는 1d, 7d, 30d 중 하나입니다.",
        400
      )
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return errorResponse(
        "INVALID_LIMIT",
        "limit은 1부터 50 사이의 정수여야 합니다.",
        400
      )
    }

    const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS]
    const currentEnd = addUtcDays(startOfUtcDay(), 1)
    const currentStart = addUtcDays(currentEnd, -days)
    const previousStart = addUtcDays(currentStart, -days)
    const itemFilter = {
      status: ItemStatus.AVAILABLE,
      ...(region
        ? { region: { contains: region, mode: "insensitive" as const } }
        : {}),
    }

    const [currentGroups, previousGroups] = await Promise.all([
      prisma.itemMetricDaily.groupBy({
        by: ["itemId"],
        where: {
          date: { gte: currentStart, lt: currentEnd },
          item: itemFilter,
        },
        _sum: {
          viewCount: true,
          rentalRequestCount: true,
          rentalApprovedCount: true,
        },
      }),
      prisma.itemMetricDaily.groupBy({
        by: ["itemId"],
        where: {
          date: { gte: previousStart, lt: currentStart },
          item: itemFilter,
        },
        _sum: {
          viewCount: true,
          rentalRequestCount: true,
          rentalApprovedCount: true,
        },
      }),
    ])

    const normalize = (group: (typeof currentGroups)[number]) => {
      const metrics = {
        viewCount: group._sum.viewCount ?? 0,
        rentalRequestCount: group._sum.rentalRequestCount ?? 0,
        rentalApprovedCount: group._sum.rentalApprovedCount ?? 0,
      }
      return {
        itemId: group.itemId,
        ...metrics,
        trendScore: scoreMetric(metrics),
      }
    }

    const currentRanking = currentGroups
      .map(normalize)
      .sort(
        (a, b) =>
          b.trendScore - a.trendScore ||
          b.rentalApprovedCount - a.rentalApprovedCount ||
          b.rentalRequestCount - a.rentalRequestCount
      )
    const previousRanking = previousGroups
      .map(normalize)
      .sort(
        (a, b) =>
          b.trendScore - a.trendScore ||
          b.rentalApprovedCount - a.rentalApprovedCount ||
          b.rentalRequestCount - a.rentalRequestCount
      )
    const previousRanks = new Map(
      previousRanking.map((metric, index) => [metric.itemId, index + 1])
    )
    const selectedMetrics = currentRanking.slice(0, limit)
    const items = await prisma.item.findMany({
      where: { id: { in: selectedMetrics.map((metric) => metric.itemId) } },
      select: {
        id: true,
        name: true,
        region: true,
        dailyPrice: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      },
    })
    const itemById = new Map(items.map((item) => [item.id, item]))

    const data = selectedMetrics.flatMap((metrics, index) => {
      const item = itemById.get(metrics.itemId)
      if (!item) return []
      const previousRank = previousRanks.get(metrics.itemId)

      return [
        {
          rank: index + 1,
          rankChange:
            previousRank === undefined ? null : previousRank - (index + 1),
          item: {
            id: item.id,
            name: item.name,
            region: item.region,
            dailyPrice: item.dailyPrice,
            thumbnailUrl: item.images[0]?.url ?? null,
          },
          metrics: {
            viewCount: metrics.viewCount,
            rentalRequestCount: metrics.rentalRequestCount,
            rentalApprovedCount: metrics.rentalApprovedCount,
            trendScore: metrics.trendScore,
          },
        },
      ]
    })

    return Response.json({
      data,
      period,
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return internalError(error)
  }
}
