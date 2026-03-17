ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_name varchar(300);
--> statement-breakpoint
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_status varchar(20) NOT NULL DEFAULT 'created';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders (user_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_checkout_status_idx
  ON public.orders (checkout_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);
--> statement-breakpoint
UPDATE public.orders
SET checkout_status = CASE
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'created'
END
WHERE checkout_status IS NULL OR checkout_status = '';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.map_checkout_order_status(
  p_checkout_status text,
  p_order_status public.order_status
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN COALESCE(p_checkout_status, '') IN ('created', 'paid', 'failed', 'cancelled') THEN p_checkout_status
    WHEN p_order_status = 'paid'::public.order_status THEN 'paid'
    WHEN p_order_status = 'cancelled'::public.order_status THEN 'cancelled'
    ELSE 'created'
  END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.checkout_order_to_json(p_order public.orders)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p_order.id,
    'orderId', p_order.order_number,
    'userId', p_order.user_id,
    'status', public.map_checkout_order_status(p_order.checkout_status, p_order.status),
    'shippingStatus', p_order.shipping_status::text,
    'totalAmount', COALESCE(p_order.subtotal_amount, 0),
    'discountAmount', COALESCE(p_order.discount_amount, 0),
    'shippingAmount', COALESCE(p_order.shipping_amount, 0),
    'finalAmount', COALESCE(p_order.total_amount, 0),
    'paymentKey', p_order.toss_payment_key,
    'paymentMethod', p_order.payment_method,
    'paidAt', p_order.paid_at,
    'recipientName', p_order.recipient_name,
    'recipientPhone', p_order.recipient_phone,
    'shippingAddress', p_order.shipping_address,
    'shippingAddressDetail', p_order.shipping_detail_address,
    'shippingZipCode', p_order.postal_code,
    'shippingMemo', p_order.order_memo,
    'orderName', p_order.order_name,
    'courierName', p_order.courier_name,
    'trackingNumber', p_order.tracking_number,
    'promotionLabel', p_order."promotionLabel",
    'couponIssueId', p_order.coupon_issue_id,
    'discountCodeId', p_order.discount_code_id,
    'createdAt', p_order.created_at,
    'updatedAt', p_order.updated_at
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_user_id uuid,
  p_order_number text,
  p_order_name text,
  p_subtotal_amount integer,
  p_discount_amount integer,
  p_shipping_amount integer,
  p_total_amount integer,
  p_recipient_name text,
  p_recipient_phone text,
  p_shipping_address text,
  p_shipping_detail_address text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_shipping_memo text DEFAULT NULL,
  p_promotion_label text DEFAULT NULL,
  p_coupon_issue_id uuid DEFAULT NULL,
  p_discount_code_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price integer;
  v_subtotal integer;
BEGIN
  IF p_user_id IS NULL OR COALESCE(TRIM(p_order_number), '') = '' THEN
    RAISE EXCEPTION 'order user_id and order_number are required';
  END IF;

  INSERT INTO public.orders (
    user_id,
    order_number,
    status,
    checkout_status,
    payment_status,
    shipping_status,
    subtotal_amount,
    discount_amount,
    shipping_amount,
    total_amount,
    recipient_name,
    recipient_phone,
    shipping_address,
    shipping_detail_address,
    postal_code,
    order_memo,
    toss_order_id,
    coupon_issue_id,
    discount_code_id,
    order_name,
    "promotionLabel",
    "shippingAmount"
  )
  VALUES (
    p_user_id,
    p_order_number,
    'pending'::public.order_status,
    'created',
    'unpaid'::public.payment_status,
    'pending_payment'::public.shipping_status,
    COALESCE(p_subtotal_amount, 0),
    COALESCE(p_discount_amount, 0),
    COALESCE(p_shipping_amount, 0),
    COALESCE(p_total_amount, 0),
    p_recipient_name,
    p_recipient_phone,
    p_shipping_address,
    p_shipping_detail_address,
    p_postal_code,
    p_shipping_memo,
    p_order_number,
    p_coupon_issue_id,
    p_discount_code_id,
    p_order_name,
    p_promotion_label,
    COALESCE(p_shipping_amount, 0)
  )
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_product_id := NULLIF(v_item ->> 'productId', '')::uuid;
    v_quantity := COALESCE((v_item ->> 'quantity')::integer, 0);
    v_unit_price := COALESCE((v_item ->> 'unitPrice')::integer, 0);
    v_subtotal := COALESCE((v_item ->> 'subtotal')::integer, 0);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name_snapshot,
      unit_price,
      quantity,
      total_price
    )
    VALUES (
      v_order.id,
      v_product_id,
      COALESCE(v_item ->> 'productName', ''),
      v_unit_price,
      v_quantity,
      v_subtotal
    );
  END LOOP;

  RETURN public.checkout_order_to_json(v_order);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_checkout_order(
  p_order_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN public.checkout_order_to_json(v_order);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.list_checkout_user_orders(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    jsonb_agg(public.checkout_order_to_json(o) ORDER BY o.created_at DESC),
    '[]'::jsonb
  )
  FROM public.orders o
  WHERE o.user_id = p_user_id
    AND public.map_checkout_order_status(o.checkout_status, o.status) IN ('created', 'paid', 'cancelled', 'failed');
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_checkout_order_items(
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'orderId', oi.order_id,
        'productId', oi.product_id,
        'productName', oi.product_name_snapshot,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.total_price
      )
      ORDER BY oi.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mark_checkout_order_failed(
  p_order_number text,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  UPDATE public.orders
  SET checkout_status = 'failed',
      updated_at = now()
  WHERE order_number = p_order_number
    AND checkout_status = 'created'
    AND (p_user_id IS NULL OR user_id = p_user_id)
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false);
  END IF;

  RETURN jsonb_build_object('updated', true, 'order', public.checkout_order_to_json(v_order));
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finalize_checkout_order_paid(
  p_order_number text,
  p_payment_key text,
  p_paid_at timestamptz,
  p_payment_method text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_product RECORD;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number
    AND checkout_status = 'created'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false);
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id
  LOOP
    UPDATE public.products
    SET "stock" = COALESCE("stock", 0) - v_item.quantity,
        "updatedAt" = now()
    WHERE id = v_item.product_id
      AND COALESCE("stock", 0) >= v_item.quantity;

    IF NOT FOUND THEN
      SELECT name, COALESCE("stock", 0) AS stock
      INTO v_product
      FROM public.products
      WHERE id = v_item.product_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found during payment finalization';
      END IF;

      RAISE EXCEPTION '[Stock] % 재고가 부족합니다. 남은 재고: %', v_product.name, v_product.stock;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET checkout_status = 'paid',
      status = 'paid'::public.order_status,
      payment_status = 'paid'::public.payment_status,
      shipping_status = 'ready'::public.shipping_status,
      toss_payment_key = p_payment_key,
      payment_method = COALESCE(p_payment_method, payment_method, '카드'),
      paid_at = p_paid_at,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  IF v_order.coupon_issue_id IS NOT NULL THEN
    UPDATE public.coupon_issues
    SET status = 'used',
        used_at = p_paid_at
    WHERE id = v_order.coupon_issue_id
      AND user_id = v_order.user_id;
  END IF;

  IF v_order.discount_code_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET used_count = used_count + 1,
        updated_at = now()
    WHERE id = v_order.discount_code_id;
  END IF;

  RETURN jsonb_build_object('updated', true, 'order', public.checkout_order_to_json(v_order));
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.cancel_checkout_order(
  p_order_number text,
  p_from_status text,
  p_requested_by text,
  p_reason text,
  p_admin_note text DEFAULT NULL,
  p_restore_inventory boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE order_number = p_order_number
    AND checkout_status = p_from_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false);
  END IF;

  IF p_restore_inventory THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = v_order.id
    LOOP
      UPDATE public.products
      SET "stock" = COALESCE("stock", 0) + v_item.quantity,
          "updatedAt" = now()
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  IF v_order.coupon_issue_id IS NOT NULL THEN
    UPDATE public.coupon_issues
    SET status = 'issued',
        used_at = NULL
    WHERE id = v_order.coupon_issue_id
      AND user_id = v_order.user_id;
  END IF;

  IF v_order.discount_code_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET used_count = GREATEST(used_count - 1, 0),
        updated_at = now()
    WHERE id = v_order.discount_code_id;
  END IF;

  UPDATE public.orders
  SET checkout_status = 'cancelled',
      status = 'cancelled'::public.order_status,
      payment_status = CASE
        WHEN p_from_status = 'paid' THEN 'cancelled'::public.payment_status
        ELSE payment_status
      END,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  INSERT INTO public.order_cancellations (
    order_id,
    reason,
    requested_by,
    status,
    approved_at,
    admin_memo
  )
  VALUES (
    v_order.id,
    COALESCE(p_reason, '취소'),
    COALESCE(p_requested_by, 'admin'),
    'completed'::public.cancel_status,
    now(),
    p_admin_note
  );

  RETURN jsonb_build_object('updated', true, 'order', public.checkout_order_to_json(v_order));
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.map_checkout_order_status(text, public.order_status) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.checkout_order_to_json(public.orders) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.create_checkout_order(uuid, text, text, integer, integer, integer, integer, text, text, text, text, text, text, text, uuid, uuid, jsonb) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.get_checkout_order(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.list_checkout_user_orders(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.get_checkout_order_items(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.mark_checkout_order_failed(text, uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.finalize_checkout_order_paid(text, text, timestamptz, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.cancel_checkout_order(text, text, text, text, text, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_checkout_order(uuid, text, text, integer, integer, integer, integer, text, text, text, text, text, text, text, uuid, uuid, jsonb) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_checkout_order(text) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.list_checkout_user_orders(uuid) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_checkout_order_items(uuid) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.mark_checkout_order_failed(text, uuid) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.finalize_checkout_order_paid(text, text, timestamptz, text) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.cancel_checkout_order(text, text, text, text, text, boolean) TO service_role;
