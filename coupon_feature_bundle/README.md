# Coupon feature handoff bundle

This folder contains a portable set of files for adding the coupon and promotion feature into a fresh repository without bringing over the rest of the older app state.

## What is included
- Admin coupon page UI in [coupon_feature_bundle/admin_coupon_page.tsx](coupon_feature_bundle/admin_coupon_page.tsx)
- Admin discount API route in [coupon_feature_bundle/admin_discounts_route.ts](coupon_feature_bundle/admin_discounts_route.ts)
- POS coupon UI snippet in [coupon_feature_bundle/pos_coupon_ui_snippet.tsx](coupon_feature_bundle/pos_coupon_ui_snippet.tsx)
- POS order API discount handling in [coupon_feature_bundle/pos_order_route.ts](coupon_feature_bundle/pos_order_route.ts)
- Prisma schema additions in [coupon_feature_bundle/prisma_schema_snippet.prisma](coupon_feature_bundle/prisma_schema_snippet.prisma)

## Copy into a fresh repo
1. Add the Prisma models and enums from [coupon_feature_bundle/prisma_schema_snippet.prisma](coupon_feature_bundle/prisma_schema_snippet.prisma) into your Prisma schema.
2. Copy [coupon_feature_bundle/admin_coupon_page.tsx](coupon_feature_bundle/admin_coupon_page.tsx) to your admin coupons page, for example [app/admin/coupons/page.tsx](app/admin/coupons/page.tsx).
3. Copy [coupon_feature_bundle/admin_discounts_route.ts](coupon_feature_bundle/admin_discounts_route.ts) to [app/api/admin/discounts/route.ts](app/api/admin/discounts/route.ts).
4. Add the coupon UI snippet from [coupon_feature_bundle/pos_coupon_ui_snippet.tsx](coupon_feature_bundle/pos_coupon_ui_snippet.tsx) to your POS checkout component.
5. Copy [coupon_feature_bundle/pos_order_route.ts](coupon_feature_bundle/pos_order_route.ts) to [app/api/pos/orders/route.ts](app/api/pos/orders/route.ts) or adapt the discount section into your existing order route.
6. Run Prisma generation and migration.

## Prisma setup
Add the discount-related enums and models, then run:

```bash
npx prisma generate
npx prisma migrate dev --name add_coupon_features
```

## Notes
- The feature expects your existing auth/session flow to be available.
- The admin page expects the discount API to be protected by role-based access.
- The POS flow sends the coupon code to the order API and applies the discount before the order is finalized.
