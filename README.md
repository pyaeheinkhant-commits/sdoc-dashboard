# SDOC Dashboard

Static dashboard for Shipping Document Verification. It reads its live data directly from Supabase and triggers the configured n8n webhooks.

## Publish with GitHub Pages

The included workflow deploys this site whenever `main` changes. In the GitHub repository, open **Settings > Pages** and choose **GitHub Actions** as the build and deployment source. After the workflow completes, the public site is available at:

`https://<github-user>.github.io/<repository-name>/`

The Supabase URL and read-only anon key are intentionally embedded in `index.html`, as required for browser access. Supabase Row Level Security must remain enabled and permit only the intended read access.