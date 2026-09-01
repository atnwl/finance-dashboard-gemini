# Teddy (Lume) Progress Log

## 2026-09-01
- **Fixed GitHub OAuth & Supabase authentication**:
  - Identified expired/unregistered Supabase publishable key causing 401 unauthorized errors during OAuth token exchange.
  - Updated `src/utils/supabase.js` with active publishable key.
  - Verified Supabase `/auth/v1/settings` endpoint responding with 200 OK.
