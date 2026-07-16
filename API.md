# 빌려요 API 명세

집에서 잠시 사용하지 않는 물건을 이웃에게 빌려주고 대여료를 받을 수 있는 서비스의 API 명세입니다.

## 1. 기본 규칙

- Base URL: `/api`
- 데이터 형식: `application/json`
- 인증: Auth.js 세션 쿠키 사용
- 날짜 형식: ISO 8601 UTC 문자열 (`2026-07-17T09:00:00.000Z`)
- 금액 단위: 원 단위 정수
- 목록 페이지네이션: `cursor`와 `limit` 사용
- 본문에 `null`이 명시된 필드는 값을 비우는 것으로 처리

### 공통 성공 응답

```json
{
  "data": {}
}
```

목록 API는 다음 형식을 사용합니다.

```json
{
  "data": [],
  "nextCursor": "item_cuid",
  "hasNext": true
}
```

### 공통 오류 응답

```json
{
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "물건을 찾을 수 없습니다."
  }
}
```

주요 HTTP 상태 코드는 다음과 같습니다.

| 상태 코드 | 의미 |
| --- | --- |
| `200` | 조회 또는 수정 성공 |
| `201` | 생성 성공 |
| `204` | 삭제 성공, 응답 본문 없음 |
| `400` | 잘못된 요청 또는 유효성 검사 실패 |
| `401` | 로그인 필요 |
| `403` | 해당 작업을 수행할 권한 없음 |
| `404` | 리소스를 찾을 수 없음 |
| `409` | 예약 기간 중복 또는 잘못된 상태 변경 |

## 2. 데이터 모델

기존 초안의 배열 필드는 DB 컬럼에 직접 저장하지 않고 Prisma 관계로 표현합니다. 사용자 ID는 이메일이 아니라 Auth.js가 생성하는 `String` ID를 사용하고, 이메일에는 `unique` 제약을 둡니다.

### User

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | Auth.js 사용자 ID |
| `email` | `String` | 로그인 이메일, 고유값 |
| `name` | `String?` | 소셜 계정 이름 |
| `nickname` | `String?` | 서비스 표시 이름 |
| `image` | `String?` | 프로필 이미지 URL |
| `trustBattery` | `Float` | 신뢰 배터리, 기본값 `80`, 최대 `100`, 음수 가능 |
| `createdAt` | `DateTime` | 가입 시각 |
| `updatedAt` | `DateTime` | 수정 시각 |

소셜 로그인 제공자는 별도 `Account` 모델의 `provider` 필드에 `google`, `kakao`, `naver`로 저장합니다.

### Item

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | 물건 ID |
| `ownerId` | `String` | 등록한 사용자 ID |
| `name` | `String` | 물건 이름 |
| `description` | `String` | 물건 설명 |
| `category` | `DEVICES \| TOOLS \| BOOKS \| LEISURE \| APPAREL` | 물건 카테고리 |
| `tradeMethod` | `MEET \| DELIVER` | 거래 방식 |
| `region` | `String` | 거래 지역 |
| `locationDetail` | `String?` | 상세 거래 위치와 협의 사항 |
| `dailyPrice` | `Int` | 1일 대여 가격 |
| `weeklyPrice` | `Int?` | 1주 대여 가격 |
| `availableFrom` | `DateTime` | 대여 가능 시작 시각 |
| `availableUntil` | `DateTime` | 대여 가능 종료 시각 |
| `status` | `AVAILABLE \| DEACTIVATED` | 게시 상태 |
| `images` | `ItemImage[]` | 물건 이미지 목록 |
| `createdAt` | `DateTime` | 등록 시각 |
| `updatedAt` | `DateTime` | 수정 시각 |

`BORROWED` 여부는 물건의 고정 상태로 저장하지 않고, 해당 기간에 승인된 `Rental`이 있는지로 판단합니다. 그래야 서로 겹치지 않는 여러 날짜 예약을 처리할 수 있습니다.

### ItemImage

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | 이미지 ID |
| `itemId` | `String` | 물건 ID |
| `url` | `String` | 이미지 URL 또는 MVP 단계의 Data URL |
| `order` | `Int` | 노출 순서 |

초기 MVP에서는 Base64 Data URL을 받을 수 있지만, 운영 환경에서는 이미지 스토리지에 업로드하고 DB에는 URL만 저장하는 방식을 권장합니다.

### ItemMetricDaily

물건별 수요와 트렌드를 계산하기 위한 일별 집계 모델입니다. 매번 전체 거래 이력을 다시 계산하지 않도록 날짜별 통계를 저장합니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | 집계 ID |
| `itemId` | `String` | 물건 ID |
| `date` | `DateTime` | 집계 날짜, 일 단위 |
| `viewCount` | `Int` | 상세 조회 수 |
| `rentalRequestCount` | `Int` | 대여 요청 수 |
| `rentalApprovedCount` | `Int` | 승인된 대여 수 |

`itemId`, `date` 조합에 복합 고유 제약을 둡니다.

### Rental

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | 대여 ID |
| `itemId` | `String` | 물건 ID |
| `borrowerId` | `String` | 빌리는 사용자 ID |
| `startAt` | `DateTime` | 대여 시작 시각 |
| `endAt` | `DateTime` | 반납 예정 시각 |
| `totalPrice` | `Int` | 요청 시점에 계산해 고정한 금액 |
| `status` | `REQUESTED \| APPROVED \| REJECTED \| BORROWED \| RETURNED \| CANCELED` | 대여 상태 |
| `createdAt` | `DateTime` | 요청 시각 |
| `updatedAt` | `DateTime` | 수정 시각 |

대여 상태 변경 흐름은 다음과 같습니다.

```text
REQUESTED ──> APPROVED ──> BORROWED ──> RETURNED
    │             │
    ├──> REJECTED └──> CANCELED
    └──> CANCELED
```

### Review

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `String` | 후기 ID |
| `rentalId` | `String` | 완료된 대여 ID |
| `authorId` | `String` | 작성자 ID |
| `targetUserId` | `String` | 평가 대상 사용자 ID |
| `rating` | `Int` | `1`부터 `5`까지 |
| `content` | `String?` | 후기 내용 |
| `createdAt` | `DateTime` | 작성 시각 |

`rentalId`, `authorId`, `targetUserId` 조합에 복합 고유 제약을 둡니다.

## 3. 필요한 API 요약

| 기능 | Method | 경로 | 인증 | 구현 상태 |
| --- | --- | --- | --- | --- |
| 소셜 로그인 및 세션 | `GET/POST` | `/api/auth/[...nextauth]` | 일부 | 구현됨 |
| 내 정보 조회 | `GET` | `/api/users/me` | 필요 | 예정 |
| 내 정보 수정 | `PATCH` | `/api/users/me` | 필요 | 예정 |
| 사용자 공개 프로필 | `GET` | `/api/users/:userId` | 불필요 | 예정 |
| 물건 목록·검색 | `GET` | `/api/items` | 불필요 | 예정 |
| 인기 물건·트렌드 | `GET` | `/api/items/trending` | 불필요 | 예정 |
| 물건 등록 | `POST` | `/api/items` | 필요 | 예정 |
| 물건 상세 | `GET` | `/api/items/:itemId` | 불필요 | 예정 |
| 물건 수정 | `PATCH` | `/api/items/:itemId` | 소유자 | 예정 |
| 물건 비활성화·삭제 | `DELETE` | `/api/items/:itemId` | 소유자 | 예정 |
| 대여 가능 여부 조회 | `GET` | `/api/items/:itemId/availability` | 불필요 | 예정 |
| 대여 요청 | `POST` | `/api/rentals` | 필요 | 예정 |
| 내 대여 목록 | `GET` | `/api/rentals` | 필요 | 예정 |
| 대여 상세 | `GET` | `/api/rentals/:rentalId` | 거래 당사자 | 예정 |
| 대여 상태 변경 | `PATCH` | `/api/rentals/:rentalId/status` | 거래 당사자 | 예정 |
| 후기 작성 | `POST` | `/api/rentals/:rentalId/review` | 거래 당사자 | 예정 |
| 사용자 후기 목록 | `GET` | `/api/users/:userId/reviews` | 불필요 | 예정 |

## 4. 인증 API

### `GET/POST /api/auth/[...nextauth]`

Auth.js가 제공하는 로그인, 콜백, 로그아웃, 세션 관련 라우트입니다. Google, Kakao, Naver 로그인이 설정되어 있습니다.

별도의 회원가입 API를 만들지 않습니다. 최초 소셜 로그인 시 Auth.js와 Prisma Adapter가 사용자를 생성합니다.

## 5. 사용자 API

### `GET /api/users/me`

현재 로그인한 사용자와 거래 요약을 조회합니다.

```json
{
  "data": {
    "id": "user_cuid",
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "길동이",
    "image": "https://example.com/profile.png",
    "mannerScore": 36.5,
    "itemCount": 3,
    "borrowedCount": 2,
    "lentCount": 5
  }
}
```

### `PATCH /api/users/me`

수정 가능한 필드는 `nickname`과 `image`입니다.

```json
{
  "nickname": "컵밥좋아",
  "image": "https://example.com/new-profile.png"
}
```

### `GET /api/users/:userId`

다른 사용자의 공개 프로필을 조회합니다. 이메일은 반환하지 않습니다.

### `GET /api/users/:userId/reviews`

사용자가 받은 후기를 최신순으로 조회합니다.

Query parameter:

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `cursor` | `String?` | 없음 | 다음 페이지 기준 후기 ID |
| `limit` | `Int` | `20` | 최대 `50` |

## 6. 물건 API

### `GET /api/items`

메인 검색과 물건 목록에 공통으로 사용하는 API입니다.

Query parameter:

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `q` | `String?` | 없음 | 이름과 설명 검색어 |
| `region` | `String?` | 없음 | 거래 지역 |
| `tradeMethod` | `MEET \| DELIVER` | 없음 | 거래 방식 |
| `minPrice` | `Int?` | 없음 | 최소 1일 가격 |
| `maxPrice` | `Int?` | 없음 | 최대 1일 가격 |
| `availableFrom` | `DateTime?` | 없음 | 필요한 기간 시작 |
| `availableUntil` | `DateTime?` | 없음 | 필요한 기간 종료 |
| `ownerId` | `String?` | 없음 | 특정 사용자의 등록 물건 |
| `sort` | `latest \| priceAsc \| priceDesc` | `latest` | 정렬 방식 |
| `cursor` | `String?` | 없음 | 다음 페이지 기준 물건 ID |
| `limit` | `Int` | `20` | 최대 `50` |

검색 결과에는 `DEACTIVATED` 물건과 요청 기간에 이미 승인된 대여가 있는 물건을 제외합니다.

검색어가 있는 요청은 검색 결과의 순서와 클릭 데이터를 분석할 수 있도록 서버 로그에 검색어, 결과 수, 요청 시각을 기록할 수 있습니다. 이메일이나 이름과 같은 개인정보는 검색 로그에 함께 저장하지 않습니다.

### `GET /api/items/trending`

최근 조회와 대여 요청이 빠르게 증가한 물건을 순위로 반환합니다. 메인 화면의 "요즘 많이 찾는 물건" 영역과 운영 지표에서 사용합니다.

Query parameter:

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `period` | `1d \| 7d \| 30d` | `7d` | 집계 기간 |
| `region` | `String?` | 없음 | 특정 지역으로 제한 |
| `limit` | `Int` | `10` | 최대 `50` |

```json
{
  "data": [
    {
      "rank": 1,
      "rankChange": 2,
      "item": {
        "id": "item_cuid",
        "name": "충전식 전동드릴",
        "region": "서울 동작구 노량진동",
        "dailyPrice": 2000,
        "thumbnailUrl": "https://example.com/drill.webp"
      },
      "metrics": {
        "viewCount": 128,
        "rentalRequestCount": 14,
        "rentalApprovedCount": 8,
        "trendScore": 230
      }
    }
  ],
  "period": "7d",
  "calculatedAt": "2026-07-17T00:00:00.000Z"
}
```

초기 트렌드 점수는 다음처럼 단순하게 계산할 수 있습니다.

```text
trendScore = viewCount + (rentalRequestCount × 5) + (rentalApprovedCount × 10)
```

- 최근 기간의 점수가 같으면 `rentalApprovedCount`, `rentalRequestCount`, 최신 등록일 순으로 정렬합니다.
- `rankChange`는 현재 기간 순위와 직전 동일 길이 기간의 순위 차이입니다.
- 같은 비로그인 사용자의 반복 새로고침은 세션 또는 익명 식별자 기준으로 일정 시간 동안 한 번만 집계합니다.
- 소유자가 본인 물건을 조회한 횟수는 집계에서 제외합니다.
- `DEACTIVATED` 물건은 트렌드 결과에서 제외합니다.
- 상세 조회 시 `viewCount`, 대여 요청 생성 시 `rentalRequestCount`, 승인 시 `rentalApprovedCount`를 트랜잭션 또는 일별 upsert로 증가시킵니다.
- 트래픽이 커지면 요청 시 실시간 계산하지 않고 주기적인 집계 작업과 캐시를 사용합니다.

### `POST /api/items`

새 물건을 등록합니다.

```json
{
  "name": "충전식 전동드릴",
  "description": "가정용으로 가볍게 사용한 제품입니다.",
  "category": "TOOLS",
  "tradeMethod": "MEET",
  "region": "서울 동작구 노량진동",
  "locationDetail": "노량진역 3번 출구",
  "dailyPrice": 2000,
  "weeklyPrice": 10000,
  "availableFrom": "2026-07-18T00:00:00.000Z",
  "availableUntil": "2026-08-18T00:00:00.000Z",
  "images": [
    {
      "url": "data:image/webp;base64,...",
      "order": 0
    }
  ]
}
```

검증 규칙:

- `name`: 2~60자
- `description`: 1~2,000자
- `category`: 지원하는 `ItemCategory` 값
- `locationDetail`: 최대 200자
- `dailyPrice`, `weeklyPrice`: `0`보다 큰 정수
- `availableFrom < availableUntil`
- `images`: 최소 1개, 최대 5개

### `GET /api/items/:itemId`

물건, 소유자의 공개 정보, 이미지와 예약 불가능 기간을 조회합니다.

### `PATCH /api/items/:itemId`

물건 소유자만 수정할 수 있습니다. `POST /api/items`와 같은 필드 중 변경할 값만 전송합니다. 승인 또는 대여 중인 거래와 충돌하도록 대여 가능 기간을 줄일 수 없습니다.

### `DELETE /api/items/:itemId`

물건 소유자만 실행할 수 있습니다. 거래 이력을 보존하기 위해 DB에서 바로 삭제하지 않고 `DEACTIVATED` 상태로 변경하는 soft delete를 권장합니다.

### `GET /api/items/:itemId/availability`

특정 기간에 대여할 수 있는지 확인합니다.

```text
/api/items/item_cuid/availability?startAt=2026-07-20T00:00:00.000Z&endAt=2026-07-22T00:00:00.000Z
```

```json
{
  "data": {
    "available": true,
    "totalPrice": 6000
  }
}
```

## 7. 대여 API

### `POST /api/rentals`

물건 대여를 요청합니다. 본인의 물건은 요청할 수 없습니다.

```json
{
  "itemId": "item_cuid",
  "startAt": "2026-07-20T00:00:00.000Z",
  "endAt": "2026-07-22T00:00:00.000Z"
}
```

서버가 물건 가격과 기간을 기준으로 `totalPrice`를 계산해야 합니다. 클라이언트가 보낸 금액은 신뢰하지 않습니다. 같은 기간에 `APPROVED` 또는 `BORROWED` 상태의 거래가 있으면 `409 RENTAL_PERIOD_CONFLICT`를 반환합니다.

### `GET /api/rentals`

현재 사용자의 대여 내역을 조회합니다.

Query parameter:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `role` | `borrower \| owner` | 빌린 내역 또는 빌려준 내역 |
| `status` | `RentalStatus?` | 특정 상태만 조회 |
| `cursor` | `String?` | 다음 페이지 기준 대여 ID |
| `limit` | `Int` | 기본 `20`, 최대 `50` |

### `GET /api/rentals/:rentalId`

물건 소유자와 대여 신청자만 조회할 수 있습니다.

### `PATCH /api/rentals/:rentalId/status`

```json
{
  "status": "APPROVED"
}
```

권한 규칙:

| 변경 | 실행 가능한 사용자 |
| --- | --- |
| `REQUESTED → APPROVED` | 물건 소유자 |
| `REQUESTED → REJECTED` | 물건 소유자 |
| `REQUESTED → CANCELED` | 대여 신청자 |
| `APPROVED → CANCELED` | 거래 당사자 |
| `APPROVED → BORROWED` | 물건 소유자 |
| `BORROWED → RETURNED` | 물건 소유자 |

상태 변경과 예약 기간 검사는 DB 트랜잭션 안에서 실행해야 합니다.

## 8. 후기 API

### `POST /api/rentals/:rentalId/review`

`RETURNED` 상태인 대여의 당사자만 후기를 작성할 수 있습니다. 같은 대여에서 같은 작성자가 같은 대상에게 후기를 중복 작성할 수 없습니다.

```json
{
  "rating": 5,
  "content": "시간 약속을 잘 지키고 물건도 깨끗하게 반납했어요."
}
```

후기 생성과 대상 사용자의 `mannerScore` 갱신은 하나의 트랜잭션으로 처리합니다.

## 9. 서버 구현 시 공통 처리

- Route Handler에서 `auth()`로 세션을 확인합니다.
- 입력값은 Zod 등의 스키마로 검증합니다.
- 소유권과 거래 당사자 여부는 클라이언트 값이 아닌 세션 사용자 ID로 판별합니다.
- Prisma 오류 원문이나 스택 트레이스를 응답에 노출하지 않습니다.
- 물건 목록에서는 이미지 전체 대신 첫 번째 대표 이미지만 반환합니다.
- Base64 이미지는 요청 크기 제한을 두고 MIME type과 크기를 검증합니다.
- 대여 기간은 끝 시각이 시작 시각보다 늦어야 하며, 기간 중복 검사는 서버에서 수행합니다.

## 10. 권장 구현 순서

1. Prisma에 `User` 확장 필드와 `Item`, `ItemImage`, `Rental`, `Review` 모델 추가
2. `GET/POST /api/items`와 `GET /api/items/:itemId` 구현
3. 물건 수정·비활성화 및 소유권 검사 구현
4. 물건 상세 조회와 일별 조회 지표 집계 구현
5. 대여 가능 여부와 가격 계산 함수 구현
6. 대여 요청, 목록, 상태 변경 API와 대여 지표 집계 구현
7. `GET /api/items/trending`과 트렌드 점수 계산 구현
8. 내 정보와 공개 프로필 API 구현
9. 후기와 매너 점수 갱신 구현
10. 이미지 스토리지 도입 후 Base64 저장 방식 제거
