# REAGE — Supabase auth.users 기반 인증 전환 설계서 (최종본 v3)

> **작성일:** 2026-03-12  
> **대상 프로젝트:** reage-web (REAGE 올핸드 미세전류 테라피)  
> **목적:** `public.users` 중심 인증 구조를 `auth.users` 중심으로 전면 재설계

---

## 1. 전환 구조 요약

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| 회원 원본 테이블 | `public.users` (serial PK) | `auth.users` (uuid PK) |
| 비즈니스 정보 | `public.users`에 혼재 | `public.profiles` 분리 |
| 이메일 회원가입 | tRPC `emailSignup` → bcrypt 저장 | `supabase.auth.signUp()` — 일반 클라이언트 사용 |
| 이메일 로그인 | tRPC `emailLogin` → 자체 JWT 발급 | `supabase.auth.signInWithPassword()` — 일반 클라이언트 사용 |
| 관리자 수동 생성 | 일반 가입과 동일 | `supabaseAdmin.auth.admin.createUser()` — admin 클라이언트 전용 |
| 세션 저장 | access_token 단독 쿠키 | access_token + refresh_token 분리 httpOnly 쿠키 |
| 세션 갱신 | 불가 (JWT 만료 시 재로그인) | `POST /api/auth/refresh` → `supabaseAdmin.auth.refreshSession()` |
| 비밀번호 재설정 | `resetToken` 직접 관리 | `supabase.auth.resetPasswordForEmail()` |
| 세션 검증 | Manus JWT 단독 | **전환 기간:** Supabase 토큰 우선 + Manus JWT 폴백 → **최종:** Supabase 세션 단일화 |
| 외래키 타입 | `integer` (users.id) | `uuid` (auth.users.id) |

---

## 2. Supabase 클라이언트 분리 원칙

서버 사이드에서 두 종류의 Supabase 클라이언트를 명확히 분리한다.

| 클라이언트 | 생성 방법 | 사용 키 | 사용 범위 |
|-----------|---------|--------|---------|
| `supabase` (일반) | `createClient(url, ANON_KEY)` | `SUPABASE_ANON_KEY` | 일반 가입, 일반 로그인, 비밀번호 재설정 요청 |
| `supabaseAdmin` (관리자) | `createClient(url, SERVICE_ROLE_KEY)` | `SUPABASE_SERVICE_ROLE_KEY` | 관리자 사용자 생성, 세션 검증(`getUser`), 세션 갱신(`refreshSession`), 로그아웃(`admin.signOut`), 소셜 콜백 사용자 등록 |

```typescript
// server/_core/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// 일반 클라이언트 — 사용자 행위(가입/로그인/비밀번호 재설정) 전용
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 관리자 클라이언트 — 서버 전용, 절대 클라이언트에 노출 금지
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

> **원칙:** 일반 사용자의 가입/로그인은 반드시 `supabase`(ANON_KEY)를 사용한다. `supabaseAdmin`은 서버가 자체적으로 수행해야 하는 관리 작업(세션 검증, 관리자 생성, 소셜 콜백 처리)에만 사용한다.

---

## 3. 회원가입 / 로그인 / 세션 흐름 설계

### 3-1. 일반 사용자 회원가입

일반 사용자 가입은 **`supabase`(ANON_KEY) 클라이언트**로 `signUp`을 호출한다. `admin.createUser`는 관리자 전용 경로에서만 사용한다.

> Supabase `signUp` 동작 원칙: Supabase 대시보드에서 **Confirm email**이 활성화된 경우 `user`는 반환되지만 `session`은 `null`이다. 사용자가 이메일 링크를 클릭해 인증을 완료한 후 세션이 발급된다. Confirm email이 비활성화된 경우 `user`와 `session`이 모두 즉시 반환된다.

```typescript
// server/routers.ts — auth.emailSignup
// 사용 클라이언트: supabase (ANON_KEY) — 일반 사용자 행위
emailSignup: publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  }))
  .mutation(async ({ input }) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { name: input.name },  // raw_user_meta_data → 트리거로 profiles 자동 생성
      },
    });
    if (error) {
      if (error.message.includes("already registered")) {
        throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 이메일입니다." });
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    return {
      success: true,
      requiresEmailConfirmation: data.session === null,
    };
  }),
```

**관리자 수동 사용자 생성** — `supabaseAdmin`(SERVICE_ROLE_KEY) 전용:

```typescript
// server/routers.ts — admin.createUser
// 사용 클라이언트: supabaseAdmin (SERVICE_ROLE_KEY) — 이메일 확인 없이 즉시 활성화
adminCreateUser: protectedProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
    role: z.enum(["user", "admin"]).default("user"),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    if (input.role !== "user") {
      await updateProfileRole(data.user!.id, input.role);
    }
    return { success: true, userId: data.user!.id };
  }),
```

### 3-2. 이메일 로그인 및 세션 쿠키 저장

이메일 로그인은 **`supabase`(ANON_KEY) 클라이언트**로 `signInWithPassword`를 호출한다. `session` 객체에는 `access_token`, `refresh_token`, `expires_in`(초), `expires_at`(Unix timestamp)이 포함된다.

**쿠키 저장 전략:** access_token과 refresh_token을 **별도의 httpOnly 쿠키**로 분리 저장한다.

```typescript
// server/routers.ts — auth.emailLogin
// 사용 클라이언트: supabase (ANON_KEY) — 일반 사용자 로그인
emailLogin: publicProcedure
  .input(z.object({ email: z.string().email(), password: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const { session } = data;
    const cookieBase = getSessionCookieOptions(ctx.req);

    // access_token: Supabase 기본 1시간 유효
    ctx.res.cookie("sb-access-token", session.access_token, {
      ...cookieBase,
      httpOnly: true,
      maxAge: session.expires_in * 1000,  // expires_in은 초 단위
    });

    // refresh_token: 장기 보존 (Supabase Auth가 실제 유효성 제어)
    // maxAge를 길게 설정하되, 실제 유효성은 Supabase가 관리
    ctx.res.cookie("sb-refresh-token", session.refresh_token, {
      ...cookieBase,
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,  // 1년 (브라우저 삭제 방지용)
    });

    return { success: true };
  }),
```

### 3-3. 세션 갱신 (Token Refresh)

access_token이 만료된 경우 클라이언트는 `/api/auth/refresh`를 호출한다. 서버는 쿠키의 refresh_token으로 Supabase에 갱신을 요청하고 새 토큰 쌍을 쿠키에 덮어쓴다.

세션 갱신은 **`supabaseAdmin`(SERVICE_ROLE_KEY)**을 사용한다. 일반 클라이언트는 `persistSession: false` 설정이므로 내부 상태 없이 refresh_token을 직접 전달해야 하기 때문이다.

> Supabase `refreshSession` 원칙: refresh_token은 **1회만 사용 가능**하다. 갱신 후 새 refresh_token이 발급되므로, 반드시 새 토큰 쌍 전체를 쿠키에 저장해야 한다. 10초 이내 재사용은 예외적으로 허용된다.

```typescript
// server/_core/index.ts — Express 라우트
app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies["sb-refresh-token"];
  if (!refreshToken) {
    return res.status(401).json({ error: "refresh_token missing" });
  }

  // supabaseAdmin 사용: service_role로 refresh_token 직접 교환
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    res.clearCookie("sb-access-token");
    res.clearCookie("sb-refresh-token");
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }

  const { session } = data;
  const cookieBase = getSessionCookieOptions(req);

  res.cookie("sb-access-token", session.access_token, {
    ...cookieBase,
    httpOnly: true,
    maxAge: session.expires_in * 1000,
  });
  res.cookie("sb-refresh-token", session.refresh_token, {
    ...cookieBase,
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true });
});
```

**클라이언트 자동 갱신 패턴:**

```typescript
// client/src/lib/trpc.ts — 401 시 자동 refresh 후 재시도
fetch(input, init) {
  return globalThis.fetch(input, { ...init, credentials: "include" })
    .then(async (res) => {
      if (res.status === 401) {
        const refreshRes = await globalThis.fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          return globalThis.fetch(input, { ...init, credentials: "include" });
        }
        window.location.href = getLoginUrl();
      }
      return res;
    });
},
```

### 3-4. 세션 검증 (서버 컨텍스트)

세션 검증은 **`supabaseAdmin`(SERVICE_ROLE_KEY)**의 `getUser(accessToken)`를 사용한다. 이 메서드는 Supabase Auth 서버에 네트워크 요청을 보내므로 토큰 위변조가 불가능하다.

```typescript
// server/_core/context.ts
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: Profile | null = null;

  // [1단계] Supabase access_token 검증 — supabaseAdmin 사용
  const accessToken = opts.req.cookies["sb-access-token"];
  if (accessToken) {
    const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!error && authUser) {
      user = await getProfileById(authUser.id);
      if (!user) {
        await upsertProfile({ id: authUser.id, name: authUser.user_metadata?.name });
        user = await getProfileById(authUser.id);
      }
    }
  }

  // [2단계] Manus JWT 폴백 (전환 기간 한정)
  // TODO: Supabase 세션 단일화 완료 후 이 블록 제거
  if (!user) {
    user = await tryManusJwt(opts.req);
  }

  return { req: opts.req, res: opts.res, user };
}
```

### 3-5. 로그아웃

Supabase Auth에서 로그아웃은 **refresh_token 폐기 중심**으로 설계한다. access_token은 JWT 특성상 만료 전까지 완전 무효화가 불가능하므로(Supabase Auth 서버에서 세션 레코드를 삭제하지만 이미 발급된 JWT는 만료 시까지 기술적으로 유효), 핵심 처리는 refresh_token 폐기와 쿠키 삭제에 집중한다.

> **access_token 즉시 무효화 불가 원칙:** Supabase는 로그아웃 시 `auth.sessions` 테이블의 세션 레코드를 삭제한다. 이후 `getUser(accessToken)` 호출 시 세션이 없으므로 인증 실패로 처리된다. 그러나 JWT 자체의 서명은 만료 전까지 유효하므로, JWT를 직접 검증하는 외부 시스템에서는 여전히 유효하게 보일 수 있다. 본 서비스는 모든 세션 검증을 `getUser(accessToken)`(서버 네트워크 요청)로 처리하므로 이 문제는 실질적으로 차단된다.

```typescript
// server/routers.ts — auth.logout
// scope: "global" — 해당 사용자의 모든 기기 세션 종료 (기본값)
// scope: "local"  — 현재 세션만 종료
// scope: "others" — 현재 세션 제외 나머지 종료
logout: protectedProcedure
  .input(z.object({ scope: z.enum(["global", "local", "others"]).default("global") }).optional())
  .mutation(async ({ ctx, input }) => {
    const accessToken = ctx.req.cookies["sb-access-token"];
    if (accessToken) {
      // supabaseAdmin.auth.admin.signOut: access_token으로 세션 식별 후
      // auth.sessions에서 해당 세션 레코드 삭제 → refresh_token 폐기
      // access_token은 만료 전까지 JWT 서명은 유효하나,
      // getUser() 검증 시 세션 레코드 없음으로 인증 실패 처리됨
      await supabaseAdmin.auth.admin.signOut(accessToken, input?.scope ?? "global");
    }

    // 쿠키 삭제 — 브라우저에서 토큰 접근 차단
    const cookieOpts = { httpOnly: true, path: "/" };
    ctx.res.clearCookie("sb-access-token", cookieOpts);
    ctx.res.clearCookie("sb-refresh-token", cookieOpts);

    // Manus JWT 쿠키도 함께 삭제 (전환 기간 한정)
    ctx.res.clearCookie(COOKIE_NAME);

    return { success: true };
  }),
```

### 3-6. 비밀번호 재설정

```typescript
// 요청: supabase (ANON_KEY) — 일반 사용자 행위
requestPasswordReset: publicProcedure
  .input(z.object({ email: z.string().email(), origin: z.string().url().optional() }))
  .mutation(async ({ input, ctx }) => {
    const origin = input.origin ?? `${ctx.req.protocol}://${ctx.req.get("host")}`;
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${origin}/find-password`,
    });
    if (error) console.error("[Auth] resetPasswordForEmail error:", error.message);
    return { success: true };  // 보안상 이메일 존재 여부 미노출
  }),

// 변경: supabaseAdmin (SERVICE_ROLE_KEY) — 서버가 직접 비밀번호 업데이트
resetPassword: publicProcedure
  .input(z.object({ accessToken: z.string(), newPassword: z.string().min(8) }))
  .mutation(async ({ input }) => {
    const { data: { user }, error: verifyErr } = await supabaseAdmin.auth.getUser(input.accessToken);
    if (verifyErr || !user) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 링크입니다." });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: input.newPassword,
    });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return { success: true };
  }),
```

---

## 4. auth.users 조회 및 연동 로직

### 4-1. 허용된 조회 방법 (공식 API 기준)

`listUsers`로 전체 유저를 가져와 email로 찾는 방식은 완전히 제거한다.

| 상황 | 사용 API | 클라이언트 | 비고 |
|------|---------|-----------|------|
| 요청 세션 검증 | `supabaseAdmin.auth.getUser(accessToken)` | admin | 네트워크 요청, 위변조 불가 |
| uuid로 사용자 조회 | `supabaseAdmin.auth.admin.getUserById(uuid)` | admin | 서버 전용 |
| 소셜 로그인 콜백 | `profiles` 테이블에서 `openId`로 조회 | — | auth.users 직접 조회 불필요 |
| 이메일로 사용자 조회 | **사용 금지** | — | `profiles.email` 컬럼으로 대체 |

### 4-2. Manus OAuth / 소셜 로그인 콜백 처리

소셜 로그인 콜백에서는 `profiles.openId` 기준으로 조회하고, 없으면 `supabaseAdmin.auth.admin.createUser`로 auth.users에 등록 후 profiles에 upsert한다.

```typescript
// server/_core/oauth.ts — 소셜 로그인 콜백 처리
async function handleOAuthCallback(userInfo: {
  openId: string;
  email: string | null;
  name: string | null;
  loginMethod: string;
}): Promise<string> {  // 반환값: auth.users.id (uuid)

  // 1. profiles.openId로 기존 사용자 조회 — O(1), 사용자 수 무관
  const existingProfile = await getProfileByOpenId(userInfo.openId);
  if (existingProfile) {
    await updateProfile(existingProfile.id, { lastSignedIn: new Date() });
    return existingProfile.id;
  }

  // 2. 신규 사용자 — supabaseAdmin으로 auth.users 등록
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: userInfo.email ?? undefined,
    email_confirm: true,
    user_metadata: {
      openId: userInfo.openId,
      name: userInfo.name,
      loginMethod: userInfo.loginMethod,
    },
  });
  if (error) throw new Error(`[OAuth] auth.users 생성 실패: ${error.message}`);

  const authUserId = data.user!.id;

  // 3. profiles upsert (트리거가 자동 생성하지만 openId 등 추가 필드 보장)
  await upsertProfile({
    id: authUserId,
    openId: userInfo.openId,
    name: userInfo.name,
    loginMethod: userInfo.loginMethod,
    lastSignedIn: new Date(),
  });

  return authUserId;
}
```

---

## 5. DB 스키마 변경

### 5-1. `public.profiles` 테이블 DDL

```sql
-- ① profiles 테이블 생성
CREATE TABLE public.profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "openId"                 varchar(64) UNIQUE,
  name                     text,
  phone                    varchar(30),
  role                     user_role NOT NULL DEFAULT 'user',
  "memberRole"             member_role NOT NULL DEFAULT 'consumer',
  "membershipDiscountRate" integer NOT NULL DEFAULT 0,
  "proVerificationStatus"  pro_verification_status NOT NULL DEFAULT 'none',
  "loginMethod"            varchar(64),
  "lastSignedIn"           timestamptz NOT NULL DEFAULT now(),
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now()
);

-- ② RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_service_role_all"
  ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- ③ 신규 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, "openId", name, "loginMethod", "createdAt", "updatedAt"
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'openId',
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    ),
    NEW.raw_user_meta_data->>'loginMethod',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 5-2. 외래키 참조 컬럼 타입 변경 (integer → uuid)

```sql
-- orders.userId 변경 예시 (나머지 14개 테이블도 동일 패턴)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_userId_fkey;
ALTER TABLE public.orders ADD COLUMN "userIdNew" uuid;

-- 매핑 기준: users_backup.id(integer) → id_mapping 테이블의 auth_uuid
UPDATE public.orders o
  SET "userIdNew" = m.auth_uuid
  FROM public.users_id_mapping m
  WHERE m.old_integer_id = o."userId";

ALTER TABLE public.orders DROP COLUMN "userId";
ALTER TABLE public.orders RENAME COLUMN "userIdNew" TO "userId";
ALTER TABLE public.orders ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_userId_fkey
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
```

### 5-3. `drizzle/schema-pg.ts` 변경 요약

```typescript
// ❌ 제거
export const users = pgTable("users", { ... });

// ✅ 추가
export const profiles = pgTable("profiles", {
  id:                      uuid("id").primaryKey(),
  openId:                  varchar("openId", { length: 64 }).unique(),
  name:                    text("name"),
  phone:                   varchar("phone", { length: 30 }),
  role:                    userRoleEnum("role").notNull().default("user"),
  memberRole:              memberRoleEnum("memberRole").notNull().default("consumer"),
  membershipDiscountRate:  integer("membershipDiscountRate").notNull().default(0),
  proVerificationStatus:   proVerificationStatusEnum("proVerificationStatus").notNull().default("none"),
  loginMethod:             varchar("loginMethod", { length: 64 }),
  lastSignedIn:            timestamp("lastSignedIn", { withTimezone: true }).notNull().defaultNow(),
  createdAt:               timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:               timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// 외래키 컬럼 타입 변경 (모든 userId, authorId, adminUserId 등)
userId: uuid("userId").notNull(),  // auth.users(id) 참조는 DB 레벨에서만 설정
```

---

## 6. 마이그레이션 실행 순서

`pnpm db:push`는 수동 SQL 마이그레이션과 충돌을 방지하기 위해 **수동 SQL을 모두 완료한 후 마지막에 실행**한다.

### Step 0 — 백업 (즉시 실행)

```sql
-- 원본 백업
CREATE TABLE public.users_backup_20260312 AS SELECT * FROM public.users;
COMMENT ON TABLE public.users_backup_20260312
  IS '2026-03-12 auth.users 전환 전 백업 — 90일 후 삭제 예정';

-- ID 매핑 테이블 생성 (마이그레이션 핵심 기준)
-- 이 테이블이 old integer id → new auth uuid 변환의 단일 진실 소스(Single Source of Truth)
CREATE TABLE public.users_id_mapping (
  old_integer_id  integer NOT NULL,
  auth_uuid       uuid    NOT NULL,
  email           text,
  open_id         varchar(64),
  migrated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (old_integer_id)
);
COMMENT ON TABLE public.users_id_mapping
  IS 'auth.users 전환 시 old integer id → auth uuid 매핑 기록. FK 업데이트 기준으로 사용.';
```

### Step 1 — Supabase Auth에 기존 사용자 등록 및 매핑 기록

기존 `public.users`의 각 사용자를 Supabase Auth에 등록하고, 응답으로 받은 `auth.users.id(uuid)`를 `users_id_mapping`에 즉시 기록한다. 이 매핑 테이블이 이후 모든 FK 업데이트의 기준이 된다.

```bash
# 현재 사용자: reflance88@gmail.com (old_integer_id: 1)
RESPONSE=$(curl -s -X POST "https://pblsxhfghmcqpcefzvfd.supabase.co/auth/v1/admin/users" \
  -H "apikey: <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reflance88@gmail.com",
    "email_confirm": true,
    "user_metadata": {
      "name": "플런스 리",
      "openId": "gdFeHfycoXR23BVAXU2d7r",
      "loginMethod": "google"
    }
  }')

# 응답에서 uuid 추출 후 매핑 테이블에 즉시 INSERT
AUTH_UUID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "auth.users.id = $AUTH_UUID"

psql "$DATABASE_URL" -c "
  INSERT INTO public.users_id_mapping (old_integer_id, auth_uuid, email, open_id)
  VALUES (1, '$AUTH_UUID', 'reflance88@gmail.com', 'gdFeHfycoXR23BVAXU2d7r');
"
```

> **사용자 수가 늘어도 안전한 방식:** 사용자가 N명으로 늘어도 위 과정을 반복하면 된다. `users_id_mapping` 테이블이 완성되면 이후 모든 FK 업데이트는 이 테이블만 참조한다. openId 메타데이터 매칭에 의존하지 않으므로 openId가 없는 이메일 가입 사용자도 동일하게 처리된다.

### Step 2 — 매핑 완료 검증

```sql
-- 모든 기존 사용자가 매핑되었는지 확인
SELECT
  COUNT(*) AS total_users,
  (SELECT COUNT(*) FROM public.users_id_mapping) AS mapped_count,
  COUNT(*) - (SELECT COUNT(*) FROM public.users_id_mapping) AS unmapped_count
FROM public.users_backup_20260312;
-- unmapped_count = 0 이어야 다음 단계 진행
```

### Step 3 — profiles 테이블 생성 및 데이터 이관

```sql
-- Step 3-1: profiles DDL 실행 (위 5-1 SQL 전체 실행)

-- Step 3-2: users_id_mapping 기준으로 profiles 이관
-- openId 메타데이터 매칭이 아닌, 명시적으로 기록된 auth_uuid를 사용
INSERT INTO public.profiles (
  id, "openId", name, phone, role, "memberRole",
  "membershipDiscountRate", "proVerificationStatus",
  "loginMethod", "lastSignedIn", "createdAt", "updatedAt"
)
SELECT
  m.auth_uuid,      -- users_id_mapping에서 명시적으로 기록된 uuid
  u."openId",
  u.name,
  u.phone,
  u.role,
  u."memberRole",
  u."membershipDiscountRate",
  u."proVerificationStatus",
  u."loginMethod",
  u."lastSignedIn",
  u."createdAt",
  u."updatedAt"
FROM public.users_backup_20260312 u
JOIN public.users_id_mapping m ON m.old_integer_id = u.id;

-- 이관 결과 검증
SELECT COUNT(*) FROM public.profiles;  -- users_backup 행 수와 일치해야 함
```

### Step 4 — 외래키 컬럼 타입 변경 (수동 SQL)

15개 테이블 각각에 대해 5-2의 패턴을 반복 실행한다. 모든 UPDATE는 `users_id_mapping.auth_uuid`를 기준으로 한다.

### Step 5 — Drizzle 스키마 수정 후 db:push

```bash
# schema-pg.ts에서 users 제거, profiles 추가, FK 타입 변경 완료 후
cd /home/ubuntu/reage-web
pnpm db:push
```

> **주의:** 수동 SQL로 이미 생성된 `profiles` 테이블이 있으면 Drizzle이 충돌을 감지할 수 있다. 이 경우 `drizzle-kit generate`로 마이그레이션 파일만 생성하고, `CREATE TABLE profiles` 구문을 제거한 후 `drizzle-kit migrate`를 실행한다.

### Step 6 — 서버 코드 수정

| 순서 | 파일 | 변경 내용 |
|------|------|---------|
| 1 | `server/_core/supabase.ts` | `supabase`(ANON_KEY) + `supabaseAdmin`(SERVICE_ROLE_KEY) 분리 |
| 2 | `drizzle/schema-pg.ts` | users 제거, profiles 추가, FK uuid 변경 |
| 3 | `server/db.ts` | users 함수 제거, profiles 함수 추가 |
| 4 | `server/_core/context.ts` | Supabase 세션 검증으로 교체 |
| 5 | `server/_core/oauth.ts` | handleOAuthCallback 패턴으로 교체 |
| 6 | `server/_core/sdk.ts` | authenticateRequest 수정 |
| 7 | `server/routers.ts` | auth 섹션 전면 교체, admin.createUser 추가 |
| 8 | `server/_core/index.ts` | `/api/auth/refresh` Express 라우트 추가 |
| 9 | `client/src/lib/trpc.ts` | 401 시 자동 refresh 인터셉터 추가 |

### Step 7 — 검증

```bash
pnpm tsc --noEmit   # TypeScript 오류 0개 확인
pnpm test           # vitest 전체 통과 확인
```

브라우저에서 회원가입 → 이메일 확인 → 로그인 → 세션 갱신 → 로그아웃 흐름 직접 테스트.

### Step 8 — public.users 삭제 (최종 검증 후)

```sql
-- 삭제 전 참조 잔존 여부 확인
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users';
-- 결과가 0행이어야 안전

DROP TABLE public.users;

-- 매핑 테이블과 백업 테이블은 90일 후 삭제
-- DROP TABLE public.users_id_mapping;       -- 2026-06-12 이후
-- DROP TABLE public.users_backup_20260312;  -- 2026-06-12 이후
```

---

## 7. public.users 삭제 조건 체크리스트

```
[ ] users_id_mapping 테이블에 모든 기존 사용자가 매핑되었음 (unmapped_count = 0)
[ ] profiles 테이블에 기존 users 데이터가 모두 이관되었음
[ ] 15개 테이블의 FK가 모두 auth.users.id(uuid)로 변경되었음
[ ] Drizzle 스키마에서 users 테이블이 완전히 제거되었음
[ ] TypeScript 오류 0개 확인
[ ] vitest 전체 통과 확인
[ ] 로그인 / 세션 갱신 / 로그아웃 브라우저 테스트 통과
[ ] 관리자 페이지에서 회원 목록 정상 조회 확인
[ ] public.users에 대한 외래키 참조가 0개임을 SQL로 확인
```

---

## 8. RLS 정책 전체 구조

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_service_role_all" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "orders_service_role_all" ON public.orders FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bv_select_own" ON public.business_verifications FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "bv_service_role_all" ON public.business_verifications FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "gallery_select_public" ON public.gallery_posts FOR SELECT USING (true);
CREATE POLICY "gallery_service_role_all" ON public.gallery_posts FOR ALL USING (auth.role() = 'service_role');
```

> **현재 서버는 `service_role` 키로 접근하므로 RLS는 서버 사이드에서 우회된다.** RLS는 클라이언트가 Supabase JS SDK를 직접 사용할 경우의 보안 레이어로 작동한다.

---

## 9. 핵심 원칙 요약

| 원칙 | 내용 |
|------|------|
| **인증 원본** | `auth.users` — 이메일/소셜 모두 여기서 관리 |
| **비즈니스 정보** | `public.profiles` — `auth.users.id`(uuid) PK/FK |
| **일반 가입/로그인** | `supabase`(ANON_KEY) — `signUp`, `signInWithPassword` |
| **관리자 생성** | `supabaseAdmin`(SERVICE_ROLE_KEY) — `admin.createUser` |
| **세션 검증/갱신/로그아웃** | `supabaseAdmin`(SERVICE_ROLE_KEY) — 서버 전용 |
| **세션 쿠키** | `sb-access-token`(1시간) + `sb-refresh-token`(1년, Supabase가 유효성 제어) |
| **세션 갱신** | `POST /api/auth/refresh` → `refreshSession(refresh_token)` → 새 토큰 쌍 저장 |
| **로그아웃** | `admin.signOut(accessToken, scope)` → refresh_token 폐기 + 쿠키 삭제 |
| **access_token 즉시 무효화** | 불가 (JWT 특성) — `getUser()` 서버 검증으로 실질 차단 |
| **auth.users 조회** | `getUser(token)` 또는 `getUserById(uuid)` — listUsers/email 검색 금지 |
| **마이그레이션 매핑 기준** | `users_id_mapping` 테이블 — old integer id → auth uuid 명시적 기록 |
| **Manus openId** | `profiles.openId` 부가 식별값으로 보존, 소셜 콜백 연동 기준 |
| **Manus JWT 폴백** | 전환 기간 한정 임시 유지 → 최종 구조에서 제거 |
| **db:push 순서** | 수동 SQL 완료 후 마지막에 실행 (충돌 방지) |
| **백업** | `users_backup_20260312` + `users_id_mapping` 90일 보존 후 삭제 |
