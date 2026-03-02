# MarryQuest Development Context (Post PR-12, Stable Phase)

이 문서는 MarryQuest 프로젝트의 **현재 기준 단일 소스 오브 트루스(Single Source of Truth)**이다.
모든 설계, Codex 프롬프트, 리팩토링, DB 변경, 핫픽스는 **이 문서를 기준으로 수행한다.**

---

# 1. 프로젝트 개요

## 1.1 목적

MarryQuest는 결혼 초대장을 단순 정보 페이지가 아닌 **참여형 인터랙티브 경험 플랫폼**으로 만드는 서비스이다.

* 신랑·신부: 로그인 후 초대장 제작
* 하객: 로그인 없이 참여
* 퀴즈, 타임라인 퍼즐, 음악 투표, 음식 투표, 방명록, RSVP 등 참여형 기능 제공

---

## 1.2 기술 스택

Frontend / Backend

* Next.js 14 (Pages Router 유지)
* React 18
* TypeScript

Auth

* NextAuth (Prisma Adapter)

Database

* Supabase (PostgreSQL)
* Prisma ORM

Deploy

* Vercel

Validation

* Zod

UI

* Tailwind CSS
* 일부 Radix UI

---

## 1.3 운영 철학 (중요)

로그인 없는 하객 참여 구조.

우선순위:

1. UX
2. 무결성
3. 보안

완전한 보안 대신 다음 전략 사용:

* IP 기반 Rate Limit
* `mq_guest` 쿠키 기반 세션 식별
* DB 제약조건(unique, count 기반 제한)
* 토큰 기반 1회성 권한 부여
* Soft 제한 + UX 친화적 메시지

---

# 2. 아키텍처 구조

## 2.1 Public 영역

URL:

* `/[slug]`
* `/[slug]/preview` (Builder Live Preview)

Invitation Page 섹션:

* Hero
* Info
* Map
* Gallery
* Accounts
* Quiz
* Timeline Puzzle
* Music Voting
* Food Voting (PR-12)
* Guestbook
* RSVP

섹션 노출은:

* `SectionConfig`
* `DEFAULT_SECTIONS`
  로 제어

---

## 2.2 Builder 영역

URL:

* `/dashboard`
* `/builder/[id or slug]`

Builder 탭:

* Basic (Design 통합)
* Sections
* Gallery
* Quiz
* Timeline
* Food
* Export
* Settings

Live Preview는 DB fetch 대신 draft 객체 전달 구조 유지.

---

## 2.3 API 구조 (pages/api)

Core:

* `/api/invitations`
* `/api/invitation/[id]`
* `/api/invitations/[id]/sections`
* `/api/invitations/[id]/slug`
* `/api/invitations/[id]/status`

Participation:

* `/api/guestbook`
* `/api/rsvp`
* `/api/quiz/[invitationId]`
* `/api/timeline/[invitationId]`
* `/api/timeline/attempt`
* `/api/music`
* `/api/music/vote`
* `/api/music/add`
* `/api/food`
* `/api/food/vote`

Export:

* `/api/export/rsvp.csv`

---

# 3. 참여 식별 전략 (mq_guest 중심)

## 3.1 mq_guest 쿠키

* `/lib/guestKey.ts`
* `getOrSetGuestKey(req, res)`
* HttpOnly
* SameSite=Lax
* Max-Age: 180 days
* production에서만 Secure

사용처:

* RSVP 제한
* Guestbook 제한
* MusicVote unique
* FoodVote unique
* RateLimit keyFn

---

## 3.2 RateLimit 구조

`lib/security/rateLimit.ts`

* 기본: IP 기반
* 확장: `keyFn?: (req)=>string`
* PR-09 이후:

  * `keyFn` 사용 시 mq_guest 우선
  * 없으면 IP fallback

---

# 4. 데이터베이스 현재 상태 (Post PR-12)

## 4.1 Invitation 정책

```ts
Invitation {
  deletedAt: DateTime?
}
```

삭제 시:

* deletedAt 설정
* status = private

모든 public API는:

* deletedAt: null 필수
* status published 조건 필수 (preview 제외)

---

## 4.2 TimelineCard (매우 중요)

Supabase 실제 컬럼:

| column           | nullable   |
| ---------------- | ---------- |
| title            | NO         |
| shortDescription | NO ('' 허용) |

Prisma:

```prisma
model TimelineCard {
  id           String @id @default(cuid())
  puzzleId     String
  text         String  @map("title")
  description  String? @map("shortDescription")
  photoUrl     String?
  order        Int
  correctOrder Int

  @@map("TimelineCard")
}
```

중요:

* shortDescription은 DB에서 NOT NULL
* API 저장 시 null 금지
* 항상 '' 사용

---

## 4.3 RSVP 제한 (PR-10 적용)

Model:

```prisma
model RSVPResponse {
  voterKey String?
  @@index([invitationId, voterKey, createdAt])
}
```

제한:

* 동일 mq_guest
* invitation 당 최대 2회

DB count 기반 제한

---

## 4.4 Guestbook 제한 (PR-10 적용)

Model:

```prisma
model GuestbookEntry {
  voterKey String?
  @@index([invitationId, voterKey, createdAt])
}
```

제한:

* 기본 1회
* quizPerfect badgeToken이 해당 POST에 포함된 경우에만 2회 허용
* bonus 영구 저장 안 함
* hidden 포함 count

---

## 4.5 MusicVote (PR-09)

```prisma
model MusicVote {
  invitationId String
  voterKey     String

  @@unique([invitationId, voterKey])
}
```

정책:

* vote OR add 중 하나만
* add 시 트랜잭션 내:

  * MusicTrack 생성
  * MusicVote 생성

---

## 4.6 FoodVote (PR-12)

Music 구조와 동일 패턴:

```prisma
model FoodVote {
  invitationId String
  voterKey     String

  @@unique([invitationId, voterKey])
}
```

Food 참여는:

* 독립 기능
* Timeline 성공과 분리
* mq_guest 기반 1회

---

# 5. PR 히스토리 (완료 기준)

PR-01 ~ PR-04

* Auth
* Invitation
* Builder 구조
* Public 렌더링

PR-05

* Guestbook
* hidden 처리

PR-06

* RSVP
* CSV Export

PR-07

* ThemeProvider
* Live Preview

PR-08

* Quiz
* badgeToken 검증

PR-09

* Timeline Puzzle
* mq_guest 도입
* MusicVote unique
* keyFn rate limit 확장

PR-10

* RSVP 2회 제한
* Guestbook 1회 + quiz bonus
* DB count 기반 제한
* 429 UX 메시지 개선

PR-11

* 운영 안정화
* RateLimit 구조 정리
* RLS 문서화
* Export 안정화

PR-12

* Food 투표 기능
* mq_guest unique 구조 재사용
* Music과 동일 패턴 유지

---

# 6. 자주 발생했던 문제 (LLM 주의)

1. Prisma 필드 ↔ DB 컬럼 mismatch
2. nullable 불일치
3. SQL Editor만 수정하고 migration 미생성
4. Live Preview가 published 조건에 막힘
5. deletedAt 조건 누락
6. unique 제약과 count 제한 혼용 시 충돌

---

# 7. 개발 원칙

DB 변경 시 항상:

1. prisma/schema.prisma 수정
2. migration 생성
3. Supabase SQL Editor 스크립트 포함

컬럼 rename은 `@map` 사용
destructive migration 금지
unique는 반드시 실제 DB에도 존재해야 함

---

# 8. 현재 시스템 상태

* Quiz 안정
* Timeline 안정
* Music 안정 (unique 기반)
* Guestbook 제한 정상
* RSVP 제한 정상
* FoodVote 정상
* keyFn 기반 rate limit 정상 동작
* Build 통과 상태

시스템은 이제:

* 기능 확장 단계가 아니라
* 안정화 / 운영 고도화 / 통계 / UX 개선 단계

---

# 9. 작업 로그 (Agent Handoff)

## 2026-03-02: Landing Page 전면 개편 (진행 완료)

배경:

* 기존 `/` 랜딩 페이지가 공사중 느낌이며 핵심 CTA(Launch Builder)가 동작하지 않음

적용 내용:

* `pages/index.tsx`를 전면 교체하여 브랜드 방향을
  * "받는 사람도 즐거운 우리의 청첩장 만들기"
  * 인터랙티브 청첩장 빌더
  로 명확히 전달하는 구조로 변경
* `getServerSideProps`에서 `getServerSession + authOptions`로 로그인 상태 확인
* 메인 CTA를 로그인 상태에 따라 분기:
  * 로그인 상태: `/dashboard`
  * 비로그인 상태: `/login?callbackUrl=%2Fdashboard`
* 미래지향/futuristic 톤 강화를 위해:
  * 애니메이션 오브(orb), 그리드 오버레이, 글래스 카드, hover 인터랙션 적용
  * 정보 카드(Playable Invitation / Live Builder Flow / Guest-First UX) 추가
* 타이포그래피 강화를 위해 전역 폰트 import 확장:
  * `styles/globals.css`에 `Manrope`, `Orbitron` 추가

변경 파일:

* `pages/index.tsx`
* `styles/globals.css`

검증 포인트:

* `/` 접속 시 메인 CTA가 실제 동작해야 함
* 로그인 세션 존재 시 CTA가 `/dashboard`로 이동해야 함
* 비로그인 상태에서는 `/login?callbackUrl=%2Fdashboard`로 이동해야 함
* 모바일/데스크톱에서 레이아웃 깨짐 없이 렌더링되어야 함

실행 검증(2026-03-02):

* `npm ci` 완료 (Node v20.20.0 / npm 10.8.2 환경)
* `npm run build` 성공 (Next.js 14.2.35, 타입/빌드 통과)
* `npm run lint`는 Next ESLint 초기 설정 프롬프트로 인해 비대화형 실행 미완료

## 2026-03-02: Dashboard + Builder UX 고도화 (진행 완료)

사전 확인:

* `pages/builder/[id].tsx` 전체 코드(탭 구조, 저장/검증 로직, DnD 흐름) 확인
* 연관 API 확인:
  * `/api/invitations`, `/api/invitations/[id]`, `/api/invitations/[id]/sections`
  * `/api/invitations/[id]/slug`, `/api/invitations/[id]/status`
  * `/api/quiz/[invitationId]`, `/api/timeline/[invitationId]`, `/api/food-vote/[invitationId]`
  * `/api/guestbook`

적용 내용:

* Dashboard (`pages/dashboard/index.tsx`)
  * 카드형 정보 구조로 전면 개편 (총 개수/상태별 카운트)
  * 검색 + 상태 필터(`all/draft/published/private`) 추가
  * 초대장 카드에 빠른 액션 추가:
    * Builder 바로 열기
    * (published인 경우) 공개 페이지 열기
    * (published인 경우) 공개 URL 복사
  * `New invitation` 생성 시 리스트 반영 후 즉시 Builder로 이동하도록 개선

* Builder (`pages/builder/[id].tsx`)
  * 상단 워크스페이스 헤더 추가:
    * 현재 초대장 핵심 정보(슬러그/상태/커플 이름)
    * Dashboard 복귀, 공개 페이지 열기(게시 상태)
  * 탭 네비게이션 UI 개선:
    * pill 형태 탭 + 탭별 unsaved 점 표시
    * 현재 탭 설명 문구 노출
  * 글로벌 액션 바 추가:
    * `Save current tab`
    * `Discard current tab`
    * `Ctrl/Cmd + S` 키보드 저장 단축키
  * 모바일 UX 개선:
    * `Editor / Preview` 토글 추가 (모바일에서 패널 전환)
  * 체크박스 기반 구형 UI 일부 교체:
    * Sections enabled, Guestbook hidden, Quiz enabled, Timeline enabled를 토글 버튼 형태로 개선
  * Sections 탭 변경 감지 개선:
    * 기존 `Section` 변경만 감지하던 로직에 `FoodVote` 변경도 포함
    * 탭 이탈 시 discard 동작에서 FoodVote draft도 함께 복원
  * Builder 내 깨진 문자열/모지바케 정리:
    * 저장/삭제 로딩 문구, 안내 문구, placeholder, confirm 문구 정리

변경 파일:

* `pages/dashboard/index.tsx`
* `pages/builder/[id].tsx`

실행 검증(2026-03-02):

* `npx tsc --noEmit` 성공
* `npm run build` 성공 (Next.js 14.2.35, 타입/빌드 통과)
