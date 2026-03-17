ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.post_images FROM anon, authenticated;
REVOKE ALL ON TABLE public.request_rate_limits FROM anon, authenticated;

ALTER FUNCTION public.is_admin() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
