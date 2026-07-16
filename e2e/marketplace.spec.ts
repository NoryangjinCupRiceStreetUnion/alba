import { expect, test, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const owner = { name: "E2E 소유자", email: "e2e-owner@alba.test" }
const borrower = { name: "E2E 대여자", email: "e2e-borrower@alba.test" }
const itemName = "E2E 전동드릴 대여"
const message = "안녕하세요, 테스트 일정으로 빌리고 싶어요."

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

test.beforeAll(cleanupTestData)

test.afterAll(async () => {
  await cleanupTestData()
  await prisma.$disconnect()
})

test("물품 등록부터 대여 승인과 채팅까지 실제 API로 동작한다", async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const borrowerContext = await browser.newContext()
  const ownerPage = await ownerContext.newPage()
  const borrowerPage = await borrowerContext.newPage()

  try {
    await login(ownerPage, owner)
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
    await expect(ownerPage).toHaveURL(`/test/${itemId}`)
    await expect(ownerPage.getByRole("heading", { name: itemName })).toBeVisible()
    await expect(ownerPage.getByRole("img", { name: itemName })).toHaveAttribute(
      "src",
      /^data:image\/png;base64,/
    )
    await expect(ownerPage.getByText("생활/공구", { exact: true })).toBeVisible()
    await expect(ownerPage.getByText("노량진역 3번 출구")).toBeVisible()

    await login(borrowerPage, borrower)
    await borrowerPage.goto("/")
    const itemLink = borrowerPage.getByRole("link", { name: new RegExp(itemName) }).first()
    await expect(itemLink).toBeVisible()
    await expect(itemLink.getByRole("img", { name: itemName })).toHaveAttribute(
      "src",
      /^data:image\/png;base64,/
    )
    await itemLink.click()
    await expect(borrowerPage).toHaveURL(`/test/${itemId}`)

    await borrowerPage.getByLabel("대여 시작일").fill(dateAfter(2))
    await borrowerPage.getByLabel("반납 예정일").fill(dateAfter(4))
    const rentalResponsePromise = borrowerPage.waitForResponse(
      (response) => response.url().endsWith("/api/rentals") && response.request().method() === "POST"
    )
    await borrowerPage.getByRole("button", { name: "대여 예약 제안하기" }).click()
    const rentalResponse = await rentalResponsePromise
    expect(rentalResponse.status()).toBe(201)
    const rental = await rentalResponse.json()
    const chatId = rental.chatId as string
    expect(rental.data.totalPrice).toBe(9000)

    await expect(borrowerPage).toHaveURL(`/chat/${chatId}`)
    await expect(borrowerPage.getByText(itemName, { exact: true })).toBeVisible()
    await expect(borrowerPage.getByText("신청중", { exact: true })).toBeVisible()

    await borrowerPage.getByPlaceholder("메시지를 입력하세요...").fill(message)
    const messageResponsePromise = borrowerPage.waitForResponse(
      (response) => response.url().endsWith(`/api/chats/${chatId}/messages`) && response.request().method() === "POST"
    )
    await borrowerPage.getByRole("button", { name: "메시지 보내기" }).click()
    expect((await messageResponsePromise).status()).toBe(201)
    await expect(borrowerPage.getByText(message)).toBeVisible()

    await borrowerPage.goto("/chat")
    await expect(borrowerPage.getByRole("link", { name: new RegExp(itemName) })).toBeVisible()
    await expect(borrowerPage.getByText(message)).toBeVisible()

    await ownerPage.goto("/chat")
    const ownerChatLink = ownerPage.getByRole("link", { name: new RegExp(itemName) })
    await expect(ownerChatLink).toBeVisible()
    await ownerChatLink.click()
    await expect(ownerPage).toHaveURL(`/chat/${chatId}`)
    await expect(ownerPage.getByText(message, { exact: true })).toBeVisible()

    const approveResponsePromise = ownerPage.waitForResponse(
      (response) => response.url().includes(`/api/rentals/`) && response.url().endsWith("/status") && response.request().method() === "PATCH"
    )
    await ownerPage.getByRole("button", { name: "대여 승인" }).click()
    expect((await approveResponsePromise).status()).toBe(200)
    await expect(ownerPage.getByText("승인됨", { exact: true })).toBeVisible()

    await borrowerPage.goto(`/chat/${chatId}`)
    await expect(borrowerPage.getByText("승인됨", { exact: true })).toBeVisible()
  } finally {
    await ownerContext.close()
    await borrowerContext.close()
  }
})
