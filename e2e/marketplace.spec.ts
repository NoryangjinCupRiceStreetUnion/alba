import { expect, test, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const owner = { name: "E2E 소유자", email: "e2e-owner@alba.test" }
const borrower = { name: "E2E 대여자", email: "e2e-borrower@alba.test" }
const itemName = "E2E 전동드릴 대여"
const message = "안녕하세요, 테스트 일정으로 빌리고 싶어요."
const reply = "네, 해당 일정에 대여 가능합니다."

function dateAfter(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function cleanupTestData() {
  const users = await prisma.user.findMany({
    where: { email: { in: [owner.email, borrower.email] } },
    select: { id: true },
  })
  const userIds = users.map(({ id }) => id)
  if (userIds.length === 0) return

  const items = await prisma.item.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  })
  const itemIds = items.map(({ id }) => id)

  await prisma.chat.deleteMany({
    where: {
      OR: [
        { ownerId: { in: userIds } },
        { borrowerId: { in: userIds } },
        ...(itemIds.length > 0 ? [{ itemId: { in: itemIds } }] : []),
      ],
    },
  })
  await prisma.review.deleteMany({
    where: { OR: [{ authorId: { in: userIds } }, { targetUserId: { in: userIds } }] },
  })
  await prisma.rental.deleteMany({
    where: {
      OR: [
        { borrowerId: { in: userIds } },
        ...(itemIds.length > 0 ? [{ itemId: { in: itemIds } }] : []),
      ],
    },
  })
  await prisma.item.deleteMany({ where: { ownerId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

async function login(page: Page, user: typeof owner) {
  await page.goto("/login")
  await page.getByLabel("테스트 이름").fill(user.name)
  await page.getByLabel("테스트 이메일 *").fill(user.email)
  await page.getByRole("button", { name: "테스트 계정으로 즉시 로그인" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByText(user.name, { exact: true })).toBeVisible()
}

function waitForChatJoin(page: Page, chatId: string) {
  return new Promise<void>((resolve) => {
    page.on("websocket", (socket) => {
      if (!socket.url().includes("/socket.io/")) return

      socket.on("framesent", ({ payload }) => {
        const frame = payload.toString()
        if (frame.includes("join-chat") && frame.includes(chatId)) {
          resolve()
        }
      })
    })
  })
}

test.beforeAll(cleanupTestData)

test.afterAll(async () => {
  await cleanupTestData()
  await prisma.$disconnect()
})

test("마켓플레이스 전체 흐름과 두 세션 실시간 채팅이 동작한다", async ({ browser, request }) => {
  test.setTimeout(120_000)

  const ownerContext = await browser.newContext()
  const borrowerContext = await browser.newContext()
  const ownerPage = await ownerContext.newPage()
  const borrowerPage = await borrowerContext.newPage()
  const runtimeFailures: string[] = []
  const rentalStart = dateAfter(2)
  const rentalEnd = dateAfter(9)

  for (const page of [ownerPage, borrowerPage]) {
    page.on("pageerror", (error) => runtimeFailures.push(`pageerror: ${error.message}`))
    page.on("response", (response) => {
      if (response.status() >= 500) {
        runtimeFailures.push(`${response.status()} ${response.request().method()} ${response.url()}`)
      }
    })
  }

  try {
    expect((await request.get("/api/users/me")).status()).toBe(401)
    expect((await request.get("/api/chats")).status()).toBe(401)
    expect(
      (
        await request.post("/api/items", {
          data: {},
        })
      ).status()
    ).toBe(401)

    await ownerPage.goto("/upload")
    await expect(ownerPage.getByRole("heading", { name: "로그인이 필요합니다" })).toBeVisible()
    await borrowerPage.goto("/chat")
    await expect(borrowerPage).toHaveURL(/\/login/)

    await login(ownerPage, owner)

    const ownerMeResponse = await ownerContext.request.get("/api/users/me")
    expect(ownerMeResponse.status()).toBe(200)
    const ownerMe = (await ownerMeResponse.json()).data
    const ownerId = ownerMe.id as string
    expect(ownerMe.trustBattery).toBe(80)

    const ownerUpdateResponse = await ownerContext.request.patch("/api/users/me", {
      data: { nickname: "E2E 공구왕" },
    })
    expect(ownerUpdateResponse.status()).toBe(200)
    expect((await ownerUpdateResponse.json()).data.nickname).toBe("E2E 공구왕")

    await ownerPage.goto("/upload")

    await ownerPage.getByLabel("물건 이미지 선택").setInputFiles({
      name: "drill.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    })
    await ownerPage.getByLabel("물건 이름").fill(itemName)
    await ownerPage.getByLabel("카테고리").selectOption("TOOLS")
    await ownerPage.getByLabel("기본 대여 지역").fill("서울 동작구 노량진동")
    await ownerPage.getByLabel("상세 거래 위치 및 협의 사항").fill("노량진역 3번 출구")
    await ownerPage.getByLabel("대여 시작 가능일").fill(dateAfter(1))
    await ownerPage.getByLabel("대여 종료 기한일").fill(dateAfter(14))
    await ownerPage.getByLabel("1일 대여 요금 (원)").fill("3000")
    await ownerPage.getByRole("checkbox").check({ force: true })
    await ownerPage.getByText("7일 대여 총 패키지 금액 (원)").locator("..").getByRole("spinbutton").fill("14000")
    await ownerPage.getByLabel("대여 물건 상세 설명").fill("배터리와 드릴 비트가 포함된 실제 E2E 테스트 물품입니다.")

    const createResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().endsWith("/api/items") && response.request().method() === "POST"
    )
    await ownerPage.getByRole("button", { name: "등록하고 목록에서 확인하기" }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    const itemId = created.data.id as string

    await expect(ownerPage.getByRole("heading", { name: "대여 물건 등록 완료!" })).toBeVisible()
    await ownerPage.getByRole("link", { name: "등록한 물건 보기" }).click()
    await expect(ownerPage).toHaveURL(`/item/${itemId}`)
    await expect(ownerPage.getByRole("heading", { name: itemName })).toBeVisible()
    await expect(ownerPage.getByRole("img", { name: itemName })).toHaveAttribute(
      "src",
      /^data:image\/png;base64,/
    )
    await expect(ownerPage.getByText("생활/공구", { exact: true })).toBeVisible()
    await expect(ownerPage.getByText("노량진역 3번 출구")).toBeVisible()

    const ownerItemResponse = await ownerContext.request.get(`/api/items/${itemId}`)
    expect(ownerItemResponse.status()).toBe(200)
    const ownerItem = (await ownerItemResponse.json()).data
    expect(ownerItem.category).toBe("TOOLS")
    expect(ownerItem.images[0].url).toMatch(/^data:image\/png;base64,/)

    const itemUpdateResponse = await ownerContext.request.patch(`/api/items/${itemId}`, {
      data: { locationDetail: "노량진역 4번 출구" },
    })
    expect(itemUpdateResponse.status()).toBe(200)
    expect((await itemUpdateResponse.json()).data.locationDetail).toBe("노량진역 4번 출구")

    const ownerItemsResponse = await ownerContext.request.get(
      `/api/items?ownerId=${ownerId}&q=${encodeURIComponent("전동드릴")}&tradeMethod=MEET&minPrice=2000&maxPrice=4000`
    )
    expect(ownerItemsResponse.status()).toBe(200)
    expect((await ownerItemsResponse.json()).data.map((item: { id: string }) => item.id)).toContain(itemId)

    const ownRentalResponse = await ownerContext.request.post("/api/rentals", {
      data: {
        itemId,
        startAt: `${rentalStart}T00:00:00.000Z`,
        endAt: `${rentalEnd}T23:59:59.000Z`,
      },
    })
    expect(ownRentalResponse.status()).toBe(400)
    expect((await ownRentalResponse.json()).error.code).toBe("OWN_ITEM")

    await login(borrowerPage, borrower)

    const borrowerMeResponse = await borrowerContext.request.get("/api/users/me")
    expect(borrowerMeResponse.status()).toBe(200)
    const borrowerMe = (await borrowerMeResponse.json()).data
    const borrowerId = borrowerMe.id as string
    expect(borrowerMe.trustBattery).toBe(80)

    await borrowerPage.goto("/")
    const searchInput = borrowerPage.getByPlaceholder("어떤 물건을 빌리고 싶으세요?")
    await searchInput.fill("존재하지 않는 물건")
    await expect(borrowerPage.getByText("조건에 맞는 물건이 없습니다")).toBeVisible()
    await searchInput.fill("전동드릴")
    await borrowerPage.getByRole("button", { name: "직거래", exact: true }).click()
    await borrowerPage.getByRole("button", { name: "노량진동", exact: true }).click()
    await borrowerPage.locator("select").filter({ has: borrowerPage.locator('option[value="priceAsc"]') }).selectOption("priceAsc")
    const itemLink = borrowerPage.getByRole("link", { name: new RegExp(itemName) }).first()
    await expect(itemLink).toBeVisible()
    await expect(itemLink.getByRole("img", { name: itemName })).toHaveAttribute(
      "src",
      /^data:image\/png;base64,/
    )
    await itemLink.click()
    await expect(borrowerPage).toHaveURL(`/item/${itemId}`)
    await expect(borrowerPage.getByText("노량진역 4번 출구")).toBeVisible()

    const availabilityResponse = await borrowerContext.request.get(
      `/api/items/${itemId}/availability?startAt=${encodeURIComponent(`${rentalStart}T00:00:00.000Z`)}&endAt=${encodeURIComponent(`${rentalEnd}T23:59:59.000Z`)}`
    )
    expect(availabilityResponse.status()).toBe(200)
    expect((await availabilityResponse.json()).data).toEqual({
      available: true,
      totalPrice: 17000,
    })

    await borrowerPage.getByLabel("대여 시작일").fill(rentalStart)
    await borrowerPage.getByLabel("반납 예정일").fill(rentalEnd)
    const rentalResponsePromise = borrowerPage.waitForResponse(
      (response) => response.url().endsWith("/api/rentals") && response.request().method() === "POST"
    )
    await borrowerPage.getByRole("button", { name: "대여 예약 제안하기" }).click()
    const rentalResponse = await rentalResponsePromise
    expect(rentalResponse.status()).toBe(201)
    const rental = await rentalResponse.json()
    const chatId = rental.chatId as string
    const rentalId = rental.data.id as string
    expect(rental.data.totalPrice).toBe(17000)

    await expect(borrowerPage).toHaveURL(`/chat/${chatId}`)
    await expect(borrowerPage.getByText(itemName, { exact: true })).toBeVisible()
    await expect(borrowerPage.getByText("신청중", { exact: true })).toBeVisible()

    const borrowerRentalsResponse = await borrowerContext.request.get("/api/rentals?role=borrower")
    expect(borrowerRentalsResponse.status()).toBe(200)
    expect((await borrowerRentalsResponse.json()).data.map((item: { id: string }) => item.id)).toContain(rentalId)

    const ownerRentalsResponse = await ownerContext.request.get("/api/rentals?role=owner")
    expect(ownerRentalsResponse.status()).toBe(200)
    expect((await ownerRentalsResponse.json()).data.map((item: { id: string }) => item.id)).toContain(rentalId)

    expect((await borrowerContext.request.get(`/api/rentals/${rentalId}`)).status()).toBe(200)
    expect((await ownerContext.request.get(`/api/rentals/${rentalId}`)).status()).toBe(200)

    const forbiddenApproval = await borrowerContext.request.patch(`/api/rentals/${rentalId}/status`, {
      data: { status: "APPROVED" },
    })
    expect(forbiddenApproval.status()).toBe(409)
    expect((await forbiddenApproval.json()).error.code).toBe("INVALID_STATUS_TRANSITION")

    const borrowerJoined = waitForChatJoin(borrowerPage, chatId)
    const ownerJoined = waitForChatJoin(ownerPage, chatId)
    await Promise.all([borrowerPage.reload(), ownerPage.goto(`/chat/${chatId}`)])
    await Promise.all([borrowerJoined, ownerJoined])

    await borrowerPage.getByPlaceholder("메시지를 입력하세요...").fill(message)
    const messageResponsePromise = borrowerPage.waitForResponse(
      (response) => response.url().endsWith(`/api/chats/${chatId}/messages`) && response.request().method() === "POST"
    )
    await borrowerPage.getByRole("button", { name: "메시지 보내기" }).click()
    expect((await messageResponsePromise).status()).toBe(201)
    await expect(borrowerPage.getByText(message)).toBeVisible()
    await expect(ownerPage.getByText(message, { exact: true })).toBeVisible()

    await ownerPage.getByPlaceholder("메시지를 입력하세요...").fill(reply)
    const replyResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().endsWith(`/api/chats/${chatId}/messages`) && response.request().method() === "POST"
    )
    await ownerPage.getByRole("button", { name: "메시지 보내기" }).click()
    expect((await replyResponsePromise).status()).toBe(201)
    await expect(ownerPage.getByText(reply, { exact: true })).toBeVisible()
    await expect(borrowerPage.getByText(reply, { exact: true })).toBeVisible()

    const chatMessagesResponse = await borrowerContext.request.get(`/api/chats/${chatId}/messages`)
    expect(chatMessagesResponse.status()).toBe(200)
    expect((await chatMessagesResponse.json()).data.map((item: { content: string }) => item.content)).toEqual([
      message,
      reply,
    ])

    expect((await borrowerContext.request.get(`/api/chats/${chatId}`)).status()).toBe(200)
    expect((await ownerContext.request.get(`/api/chats/${chatId}`)).status()).toBe(200)

    await borrowerPage.goto("/chat")
    await expect(borrowerPage.getByRole("link", { name: new RegExp(itemName) })).toBeVisible()
    await expect(borrowerPage.getByText(reply)).toBeVisible()

    await ownerPage.goto("/chat")
    const ownerChatLink = ownerPage.getByRole("link", { name: new RegExp(itemName) })
    await expect(ownerChatLink).toBeVisible()
    await ownerChatLink.click()
    await expect(ownerPage).toHaveURL(`/chat/${chatId}`)
    await expect(ownerPage.getByText(message, { exact: true })).toBeVisible()
    await expect(ownerPage.getByText(reply, { exact: true })).toBeVisible()

    const approveResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().includes(`/api/rentals/`) && response.url().endsWith("/status") && response.request().method() === "PATCH"
    )
    await ownerPage.getByRole("button", { name: "대여 승인" }).click()
    expect((await approveResponsePromise).status()).toBe(200)
    await expect(ownerPage.getByText("승인됨", { exact: true })).toBeVisible()

    const unavailableResponse = await borrowerContext.request.get(
      `/api/items/${itemId}/availability?startAt=${encodeURIComponent(`${rentalStart}T00:00:00.000Z`)}&endAt=${encodeURIComponent(`${rentalEnd}T23:59:59.000Z`)}`
    )
    expect(unavailableResponse.status()).toBe(200)
    expect((await unavailableResponse.json()).data).toEqual({
      available: false,
      totalPrice: null,
    })

    const startResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().endsWith(`/api/rentals/${rentalId}/status`) && response.request().method() === "PATCH"
    )
    await ownerPage.getByRole("button", { name: "대여 시작 확인" }).click()
    expect((await startResponsePromise).status()).toBe(200)
    await expect(ownerPage.getByText("대여중", { exact: true })).toBeVisible()

    const returnResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().endsWith(`/api/rentals/${rentalId}/status`) && response.request().method() === "PATCH"
    )
    await ownerPage.getByRole("button", { name: "반납 완료 처리" }).click()
    expect((await returnResponsePromise).status()).toBe(200)
    await expect(ownerPage.getByText("반납완료", { exact: true })).toBeVisible()

    await borrowerPage.goto(`/chat/${chatId}`)
    await expect(borrowerPage.getByText("반납완료", { exact: true })).toBeVisible()

    const borrowerReviewResponse = await borrowerContext.request.post(`/api/rentals/${rentalId}/review`, {
      data: { rating: 5, content: "약속 시간을 잘 지킨 친절한 소유자입니다." },
    })
    expect(borrowerReviewResponse.status()).toBe(201)
    expect((await borrowerReviewResponse.json()).data.trustBattery).toBe(85)

    const ownerReviewResponse = await ownerContext.request.post(`/api/rentals/${rentalId}/review`, {
      data: { rating: 4, content: "물건을 깨끗하게 사용한 대여자입니다." },
    })
    expect(ownerReviewResponse.status()).toBe(201)
    expect((await ownerReviewResponse.json()).data.trustBattery).toBe(83)

    expect(
      (
        await borrowerContext.request.post(`/api/rentals/${rentalId}/review`, {
          data: { rating: 5 },
        })
      ).status()
    ).toBe(409)

    const ownerProfileResponse = await request.get(`/api/users/${ownerId}`)
    expect(ownerProfileResponse.status()).toBe(200)
    const ownerProfile = (await ownerProfileResponse.json()).data
    expect(ownerProfile.trustBattery).toBe(85)
    expect(ownerProfile.reviewCount).toBe(1)

    const borrowerProfileResponse = await request.get(`/api/users/${borrowerId}`)
    expect(borrowerProfileResponse.status()).toBe(200)
    expect((await borrowerProfileResponse.json()).data.trustBattery).toBe(83)

    const ownerReviewsResponse = await request.get(`/api/users/${ownerId}/reviews`)
    expect(ownerReviewsResponse.status()).toBe(200)
    expect((await ownerReviewsResponse.json()).data[0].rating).toBe(5)

    const trendingResponse = await request.get("/api/items/trending?period=1d&limit=10")
    expect(trendingResponse.status()).toBe(200)
    expect((await trendingResponse.json()).data.map((entry: { item: { id: string } }) => entry.item.id)).toContain(itemId)

    const deactivateResponse = await ownerContext.request.delete(`/api/items/${itemId}`)
    expect(deactivateResponse.status()).toBe(204)
    expect((await borrowerContext.request.get(`/api/items/${itemId}`)).status()).toBe(404)
    expect((await ownerContext.request.get(`/api/items/${itemId}`)).status()).toBe(200)

    await borrowerPage.goto("/")
    await expect(borrowerPage.getByRole("link", { name: new RegExp(itemName) })).toHaveCount(0)

    expect(runtimeFailures).toEqual([])
  } finally {
    await ownerContext.close()
    await borrowerContext.close()
  }
})
