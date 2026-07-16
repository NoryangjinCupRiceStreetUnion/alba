import type { Prisma, PrismaClient } from "@prisma/client"

type MetricClient = Pick<PrismaClient, "itemMetricDaily">

export const BLOCKING_RENTAL_STATUSES = ["APPROVED", "BORROWED"] as const

export function startOfUtcDay(value = new Date()) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

export function calculateRentalPrice(input: {
  startAt: Date
  endAt: Date
  dailyPrice: number
  weeklyPrice: number | null
}) {
  const { startAt, endAt, dailyPrice, weeklyPrice } = input
  const dayInMilliseconds = 24 * 60 * 60 * 1000
  const days = Math.max(
    1,
    Math.ceil((endAt.getTime() - startAt.getTime()) / dayInMilliseconds)
  )

  if (weeklyPrice === null) return dailyPrice * days

  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7
  const weeklyRate = Math.min(weeklyPrice, dailyPrice * 7)

  return weeks * weeklyRate + remainingDays * dailyPrice
}

export function overlapsRentalPeriod(startAt: Date, endAt: Date) {
  return {
    startAt: { lt: endAt },
    endAt: { gt: startAt },
  } satisfies Prisma.RentalWhereInput
}

export async function incrementDailyMetric(
  client: MetricClient,
  itemId: string,
  metric: "viewCount" | "rentalRequestCount" | "rentalApprovedCount"
) {
  const date = startOfUtcDay()

  await client.itemMetricDaily.upsert({
    where: { itemId_date: { itemId, date } },
    create: { itemId, date, [metric]: 1 },
    update: { [metric]: { increment: 1 } },
  })
}

const TRUST_BATTERY_DELTA: Record<number, number> = {
  1: -10,
  2: -5,
  3: 0,
  4: 3,
  5: 5,
}

export function applyTrustBatteryRating(current: number, rating: number) {
  return Math.min(100, current + (TRUST_BATTERY_DELTA[rating] ?? 0))
}
