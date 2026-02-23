# Supabase RLS 적용 여부 (PR-11)

## 현재 커넥션 경로
- 애플리케이션의 DB 접근은 `prisma/schema.prisma`의 `datasource db`가 `DATABASE_URL`을 사용하도록 되어 있으며, 서버 API는 Prisma Client를 통해 Postgres에 직접 접근한다.
- Next.js API route 코드에서 Supabase JS client + anon key를 사용한 쿼리 경로는 사용하지 않는다.

## 결론: 이 프로젝트는 RLS에 의존하지 않음
- 현재 구조(서버 Prisma 직결)에서는 Supabase Dashboard의 RLS 정책이 기본 보호선이 아니다.
- 특히 service-role 또는 Postgres direct 연결은 RLS를 우회할 수 있으므로, 운영 방어선은 애플리케이션 레이어에서 강제해야 한다.

## 운영 정책
1. Public/owner 조회에서 `Invitation.deletedAt: null` 강제.
2. Public endpoint는 `status = 'published'` 조건을 강제.
3. 인증이 필요한 endpoint는 NextAuth 기반 owner 인증 또는 `ADMIN_PASSPHRASE` 검증을 적용.
4. public 입력은 Zod validation + 표준 에러 코드로 응답.
5. `mq_guest` 쿠키 기반 rate limit key를 우선 적용하고, 없으면 IP fallback.
6. DB 제약(예: `MusicVote` unique, voterKey 기반 count 제한)을 2차 보호선으로 유지.

## 프로덕션 점검 체크리스트
- `DATABASE_URL`이 어떤 계정/역할로 연결되는지(Supabase pooler user, direct postgres user 등) 확인.
- 해당 계정이 RLS를 우회하는 권한인지 확인.
- 우회 가능한 역할이라면 본 문서 정책(애플리케이션 레이어 보호)을 필수로 유지.
