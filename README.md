# DALALI Admin Dashboard

Web dashboard for DALALI admins. Tenants use the Android app; admins use this.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production files in dist/
```

Sign in by picking a demo admin (any password works in demo mode).

## Pages

| Page | What admins do there |
|---|---|
| Overview | Revenue, escrow, listings, tenants at a glance; things needing attention; quick actions |
| Listings | Post, edit, publish/hide, mark rented, feature, duplicate, delete, bulk actions, CSV export |
| Tenants | Registered tenants and guests; message, grant free unlock, remove access, refund, suspend, notes |
| Inbox | Chat with tenants. Replies show the logged-in admin's name (e.g. "Evans · DALALI"). Call button, assign, resolve, quick replies |
| Viewings | Confirm, decline, reschedule, mark done |
| Payments & escrow | Unlock fees and deposits; confirm pending, refund, release escrow to landlord, CSV export |
| Settings | Guest browsing, unlock price and what is locked, payment methods, escrow rules, chat name format, in-app calls, admin team |

Product rules from the client notes: only two roles (tenant, admin), and all admins have equal rights; guests can browse, and seeing a
property's contact/location requires paying an unlock fee; no KYC; chat comes from the real admin, not a fake persona.

## Demo data → real backend

All data lives in `src/data/store.tsx` (seeded from `src/data/seed.ts`, saved in the browser's localStorage).
The data model is in `src/data/types.ts`, and the Android app and this dashboard should share it.

To go live, replace the action bodies in `store.tsx` with calls to the backend (Firebase, Supabase or a REST API).
Pages only use `useStore()`, so they don't need to change. Things the backend must provide:

- **Admin auth** (sign-in is demo-only right now)
- **Mobile money payments** (e.g. Selcom, AzamPay or ClickPesa for M-Pesa / Tigo Pesa / Airtel Money / HaloPesa) with webhooks that mark payments paid
- **Escrow** holding and payout of deposits
- **Realtime chat** shared with the Android app
- **In-app voice calls** via a voice SDK (e.g. Agora or Twilio). The call button and call log are ready, but the audio is simulated
- **Photo storage** (uploads are stored inline in demo mode)
