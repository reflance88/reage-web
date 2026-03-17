CREATE OR REPLACE FUNCTION public.parse_price_int(p_value text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    FLOOR(
      NULLIF(
        REGEXP_REPLACE(COALESCE(p_value, '0'), '[^0-9.-]', '', 'g'),
        ''
      )::numeric
    )::integer,
    0
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.apply_rate_discount_int(
  p_base_amount integer,
  p_discount_rate integer,
  p_truncate_unit integer DEFAULT 0,
  p_max_discount integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_discount integer := 0;
BEGIN
  IF COALESCE(p_base_amount, 0) <= 0 OR COALESCE(p_discount_rate, 0) <= 0 THEN
    RETURN 0;
  END IF;

  v_discount := FLOOR((p_base_amount::numeric * p_discount_rate::numeric) / 100.0)::integer;

  IF COALESCE(p_truncate_unit, 0) > 0 THEN
    v_discount := FLOOR(v_discount::numeric / p_truncate_unit::numeric)::integer * p_truncate_unit;
  END IF;

  IF p_max_discount IS NOT NULL AND p_max_discount > 0 THEN
    RETURN LEAST(v_discount, p_max_discount);
  END IF;

  RETURN v_discount;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.build_checkout_base_quote(
  p_user_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_item jsonb;
  v_product RECORD;
  v_tier text := 'consumer';
  v_quantity integer;
  v_consumer_price integer;
  v_pro_price integer;
  v_membership_price integer;
  v_unit_price integer;
  v_line_subtotal integer;
  v_subtotal integer := 0;
  v_shipping_amount integer := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN:다른 사용자의 주문 견적은 조회할 수 없습니다.';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND:사용자를 찾을 수 없습니다.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'BAD_REQUEST:주문 상품이 비어 있습니다.';
  END IF;

  SELECT
    p."memberRole" AS member_role,
    p."proVerificationStatus" AS pro_verification_status,
    COALESCE(p."membershipDiscountRate", 0) AS membership_discount_rate
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND:사용자를 찾을 수 없습니다.';
  END IF;

  IF v_profile.member_role = 'membership' THEN
    v_tier := 'membership';
  ELSIF v_profile.member_role = 'professional' AND v_profile.pro_verification_status = 'approved' THEN
    v_tier := 'professional';
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_quantity := NULLIF(TRIM(COALESCE(v_item ->> 'quantity', '')), '')::integer;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'BAD_REQUEST:올바른 수량을 입력해주세요.';
    END;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'BAD_REQUEST:올바른 수량을 입력해주세요.';
    END IF;

    BEGIN
      SELECT
        p.id,
        p.name,
        COALESCE(p."priceConsumer", '0') AS price_consumer,
        COALESCE(p."pricePro", p."priceConsumer", '0') AS price_pro,
        p."priceMembership" AS price_membership,
        COALESCE(p."isProOnly", false) AS is_pro_only,
        COALESCE(p."stock", 0) AS stock,
        COALESCE(p."isActive", false) AS is_active,
        COALESCE(p."visible", false) AS is_visible
      INTO v_product
      FROM public.products p
      WHERE p.id = (v_item ->> 'productId')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'NOT_FOUND:구매할 수 없는 상품이 포함되어 있습니다.';
    END;

    IF NOT FOUND OR NOT v_product.is_active OR NOT v_product.is_visible THEN
      RAISE EXCEPTION 'NOT_FOUND:구매할 수 없는 상품이 포함되어 있습니다.';
    END IF;

    IF v_product.is_pro_only AND v_tier NOT IN ('professional', 'membership') THEN
      RAISE EXCEPTION 'FORBIDDEN:%은(는) 전문가 전용 상품입니다.', v_product.name;
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'BAD_REQUEST:% 재고가 부족합니다.', v_product.name;
    END IF;

    v_consumer_price := public.parse_price_int(v_product.price_consumer);
    v_pro_price := public.parse_price_int(v_product.price_pro);
    v_membership_price := CASE
      WHEN v_product.price_membership IS NULL THEN NULL
      ELSE public.parse_price_int(v_product.price_membership)
    END;

    IF v_tier = 'membership' THEN
      v_unit_price := COALESCE(
        v_membership_price,
        GREATEST(
          v_pro_price - public.apply_rate_discount_int(v_pro_price, v_profile.membership_discount_rate, 0, NULL),
          0
        )
      );
    ELSIF v_tier = 'professional' THEN
      v_unit_price := v_pro_price;
    ELSE
      v_unit_price := v_consumer_price;
    END IF;

    v_line_subtotal := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_subtotal;
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'productName', v_product.name,
        'quantity', v_quantity,
        'unitPrice', v_unit_price,
        'subtotal', v_line_subtotal
      )
    );
  END LOOP;

  IF v_subtotal > 0 AND v_subtotal < 100000 THEN
    v_shipping_amount := 3000;
  END IF;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'items', v_items,
    'subtotal', v_subtotal,
    'shippingAmount', v_shipping_amount
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.parse_price_int(text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.apply_rate_discount_int(integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.build_checkout_base_quote(uuid, jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.build_checkout_base_quote(uuid, jsonb) TO authenticated, service_role;
