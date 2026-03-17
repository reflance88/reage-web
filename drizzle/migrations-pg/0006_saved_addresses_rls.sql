ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
	CREATE POLICY saved_addresses_select_own
		ON public.saved_addresses
		FOR SELECT
		TO authenticated
		USING (auth.uid() = "userId");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE POLICY saved_addresses_insert_own
		ON public.saved_addresses
		FOR INSERT
		TO authenticated
		WITH CHECK (auth.uid() = "userId");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE POLICY saved_addresses_update_own
		ON public.saved_addresses
		FOR UPDATE
		TO authenticated
		USING (auth.uid() = "userId")
		WITH CHECK (auth.uid() = "userId");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	CREATE POLICY saved_addresses_delete_own
		ON public.saved_addresses
		FOR DELETE
		TO authenticated
		USING (auth.uid() = "userId");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
