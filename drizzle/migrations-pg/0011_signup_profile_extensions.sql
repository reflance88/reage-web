ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username varchar(32);
--> statement-breakpoint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "landlinePhone" varchar(30);
--> statement-breakpoint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "marketingSmsConsent" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "marketingEmailConsent" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (username)
  WHERE username IS NOT NULL;
