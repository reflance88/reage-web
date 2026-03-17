ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_issue_id uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_coupon_issue_id_idx
  ON public.orders (coupon_issue_id);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_coupon_issue_id_fkey
    FOREIGN KEY (coupon_issue_id) REFERENCES public.coupon_issues(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.build_checkout_promotion_quote(
  p_user_id uuid,
  p_subtotal integer,
  p_shipping_amount integer,
  p_items jsonb,
  p_coupon_issue_id uuid DEFAULT NULL,
  p_discount_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_discount_code RECORD;
  v_coupon_issue RECORD;
  v_item jsonb;
  v_item_product_id uuid;
  v_item_subtotal integer;
  v_discount_code_id uuid := NULL;
  v_target_amount integer := 0;
  v_discount_amount integer := 0;
  v_shipping_amount integer := GREATEST(COALESCE(p_shipping_amount, 0), 0);
  v_coupon_base_amount integer := 0;
  v_labels text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN:다른 사용자의 프로모션 견적은 조회할 수 없습니다.';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND:사용자를 찾을 수 없습니다.';
  END IF;

  IF COALESCE(TRIM(p_discount_code), '') <> '' THEN
    SELECT
      dc.id,
      dc.code,
      dc.discount_type,
      dc.discount_value,
      dc.target_type,
      dc.target_id,
      dc.usage_limit,
      dc.used_count,
      dc.starts_at,
      dc.ends_at,
      dc.is_active
    INTO v_discount_code
    FROM public.discount_codes dc
    WHERE UPPER(dc.code) = UPPER(TRIM(p_discount_code))
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND:유효하지 않은 할인코드입니다.';
    END IF;

    IF NOT v_discount_code.is_active THEN
      RAISE EXCEPTION 'BAD_REQUEST:비활성화된 할인코드입니다.';
    END IF;

    IF v_discount_code.starts_at IS NOT NULL AND now() < v_discount_code.starts_at THEN
      RAISE EXCEPTION 'BAD_REQUEST:아직 사용할 수 없는 할인코드입니다.';
    END IF;

    IF v_discount_code.ends_at IS NOT NULL AND now() > v_discount_code.ends_at THEN
      RAISE EXCEPTION 'BAD_REQUEST:만료된 할인코드입니다.';
    END IF;

    IF v_discount_code.usage_limit IS NOT NULL AND v_discount_code.used_count >= v_discount_code.usage_limit THEN
      RAISE EXCEPTION 'BAD_REQUEST:사용 한도가 소진된 할인코드입니다.';
    END IF;

    IF v_discount_code.target_type = 'order' THEN
      v_target_amount := GREATEST(COALESCE(p_subtotal, 0), 0);
    ELSIF v_discount_code.target_type = 'product' THEN
      v_target_amount := 0;

      FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
      LOOP
        BEGIN
          v_item_product_id := (v_item -> 'product' ->> 'id')::uuid;
        EXCEPTION
          WHEN invalid_text_representation THEN
            CONTINUE;
        END;

        IF v_item_product_id = v_discount_code.target_id THEN
          v_item_subtotal := COALESCE((v_item ->> 'subtotal')::integer, 0);
          v_target_amount := v_target_amount + v_item_subtotal;
        END IF;
      END LOOP;

      IF v_target_amount <= 0 THEN
        RAISE EXCEPTION 'BAD_REQUEST:할인 대상 상품이 주문에 없습니다.';
      END IF;
    ELSE
      RAISE EXCEPTION 'BAD_REQUEST:지원하지 않는 할인코드 유형입니다.';
    END IF;

    IF v_discount_code.discount_type = 'percent' THEN
      v_discount_amount := v_discount_amount + public.apply_rate_discount_int(v_target_amount, v_discount_code.discount_value, 0, NULL);
    ELSE
      v_discount_amount := v_discount_amount + LEAST(v_target_amount, v_discount_code.discount_value);
    END IF;

    v_labels := array_append(v_labels, v_discount_code.code);
    v_discount_code_id := v_discount_code.id;
  END IF;

  IF p_coupon_issue_id IS NOT NULL THEN
    SELECT
      ci.id AS issue_id,
      ci.user_id,
      ci.status AS issue_status,
      ci.issued_at,
      ci.used_at,
      ci.expired_at,
      c.name AS coupon_name,
      c.status AS coupon_status,
      c."benefitType" AS benefit_type,
      c."benefitValue" AS benefit_value,
      c."startDate" AS start_date,
      c."endDate" AS end_date,
      c."periodType" AS period_type,
      c."validDays" AS valid_days,
      c."minAmountType" AS min_amount_type,
      c."minAmount" AS min_amount,
      c."calcBasis" AS calc_basis
    INTO v_coupon_issue
    FROM public.coupon_issues ci
    INNER JOIN public.coupons c
      ON c.id = ci.coupon_id
    WHERE ci.id = p_coupon_issue_id
      AND ci.user_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAD_REQUEST:사용할 수 없는 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.issue_status <> 'issued' OR v_coupon_issue.used_at IS NOT NULL THEN
      RAISE EXCEPTION 'BAD_REQUEST:사용할 수 없는 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.expired_at IS NOT NULL AND now() > v_coupon_issue.expired_at THEN
      RAISE EXCEPTION 'BAD_REQUEST:만료된 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.coupon_status <> 'active' THEN
      RAISE EXCEPTION 'BAD_REQUEST:비활성화된 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.start_date IS NOT NULL AND now() < v_coupon_issue.start_date THEN
      RAISE EXCEPTION 'BAD_REQUEST:아직 사용할 수 없는 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.period_type = 'days_from_issue'
      AND COALESCE(v_coupon_issue.valid_days, 0) > 0
      AND now() > (v_coupon_issue.issued_at + make_interval(days => v_coupon_issue.valid_days))
    THEN
      RAISE EXCEPTION 'BAD_REQUEST:만료된 쿠폰입니다.';
    END IF;

    IF v_coupon_issue.end_date IS NOT NULL AND now() > v_coupon_issue.end_date THEN
      RAISE EXCEPTION 'BAD_REQUEST:만료된 쿠폰입니다.';
    END IF;

    v_coupon_base_amount := CASE
      WHEN v_coupon_issue.calc_basis = 'after_discount' THEN GREATEST(COALESCE(p_subtotal, 0) - v_discount_amount, 0)
      ELSE GREATEST(COALESCE(p_subtotal, 0), 0)
    END;

    IF COALESCE(v_coupon_issue.min_amount_type, 'none') <> 'none'
      AND v_coupon_base_amount < COALESCE(v_coupon_issue.min_amount, 0)
    THEN
      RAISE EXCEPTION 'BAD_REQUEST:쿠폰 최소 주문 금액을 충족하지 못했습니다.';
    END IF;

    IF v_coupon_issue.benefit_type = 'discount_amount' THEN
      v_discount_amount := v_discount_amount + LEAST(v_coupon_base_amount, COALESCE(v_coupon_issue.benefit_value, 0));
    ELSIF v_coupon_issue.benefit_type = 'discount_rate' THEN
      v_discount_amount := v_discount_amount + public.apply_rate_discount_int(v_coupon_base_amount, COALESCE(v_coupon_issue.benefit_value, 0), 0, NULL);
    ELSIF v_coupon_issue.benefit_type IN ('free_basic_shipping', 'free_all_shipping') THEN
      v_shipping_amount := 0;
    ELSE
      RAISE EXCEPTION 'BAD_REQUEST:지원하지 않는 쿠폰 혜택입니다.';
    END IF;

    v_labels := array_append(v_labels, v_coupon_issue.coupon_name);
  END IF;

  RETURN jsonb_build_object(
    'discountAmount', GREATEST(v_discount_amount, 0),
    'shippingAmount', GREATEST(v_shipping_amount, 0),
    'promotionLabel', CASE WHEN array_length(v_labels, 1) > 0 THEN array_to_string(v_labels, ' + ') ELSE NULL END,
    'couponIssueId', p_coupon_issue_id,
    'discountCodeId', v_discount_code_id
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.build_checkout_promotion_quote(uuid, integer, integer, jsonb, uuid, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.build_checkout_promotion_quote(uuid, integer, integer, jsonb, uuid, text) TO authenticated, service_role;
