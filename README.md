# SDOC Dashboard

Static dashboard for Shipping Document Verification. It reads its live data directly from Supabase and triggers the configured n8n webhooks.

## Public Prototype

The dashboard is deployed with GitHub Pages:

https://pyaeheinkhant-commits.github.io/sdoc-dashboard/

The included GitHub Actions workflow deploys the site whenever `main` changes.

The Supabase URL and read-only anon key are intentionally embedded in `index.html`, as required for browser access. Supabase Row Level Security must remain enabled and permit only the intended read access.
