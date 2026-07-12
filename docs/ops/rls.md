# PostgreSQL RLS 운영 정책

## 현재 코드 경로와 목표 Neon 연결
- 현재 코드의 데이터베이스 접근은 Prisma Client를 통한 서버 측 PostgreSQL 접근이다.
- 목표 Neon 환경에서는 애플리케이션 runtime에 pooled `DATABASE_URL`을, Prisma migration에 direct `DIRECT_URL`을 사용할 예정이다.
- Neon staging과 production은 아직 provision되지 않았으며, 실제 Neon connection 또는 migration은 수행되지 않았다.
- Next.js API route에는 Supabase JS client + anon key를 통한 database query 경로가 없다.
- Timeline upload의 Supabase Storage 사용은 database RLS와 별개이며, 다음 Recovery PR에서 교체할 범위다.

## 결론: 이 프로젝트는 RLS에 의존하지 않음
- 현재 서버 기반 Prisma 구조에서는 provider의 RLS 설정을 기본 보호선으로 가정하지 않는다.
- runtime 또는 migration role의 권한과 무관하게 운영 방어선은 애플리케이션 인증·인가와 database constraint에서 강제한다.

## 운영 정책
1. Public/owner 조회에서 `Invitation.deletedAt: null` 강제.
2. Public endpoint는 `status = 'published'` 조건을 강제.
3. 인증이 필요한 endpoint는 NextAuth 기반 owner 인증 또는 `ADMIN_PASSPHRASE` 검증을 적용.
4. public 입력은 Zod validation + 표준 에러 코드로 응답.
5. `mq_guest` 쿠키 기반 rate limit key를 우선 적용하고, 없으면 IP fallback.
6. DB 제약(예: `MusicVote` unique, voterKey 기반 count 제한)을 2차 보호선으로 유지.

## 향후 Neon 환경 점검 체크리스트
- pooled `DATABASE_URL`과 direct `DIRECT_URL`이 서로 의도한 Neon role과 endpoint를 사용하는지 확인.
- 각 role의 권한과 RLS 우회 가능 여부를 명시적으로 확인하되, 확인 전에는 enabled/disabled 상태를 단정하지 않는다.
- RLS 상태와 관계없이 본 문서의 애플리케이션 레이어 보호 정책을 유지한다.
- connection string과 credential을 문서, commit, PR, CI 로그에 남기지 않는다.
