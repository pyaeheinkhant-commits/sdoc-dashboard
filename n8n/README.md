# SDOC n8n Workflows

This folder contains the n8n workflow exports for the SDOC Control Tower prototype and the SQL required for the review and resolution tables.

## Included Workflows

| File | Purpose |
|---|---|
| `Workflow_A_FX (1).json` | Batch-fetches and classifies the inbox dataset. |
| `Workflow_BL.C_FX (1).json` | Identifies SI and draft BL documents, extracts fields, compares them, and saves the result. |
| `Workflow_D_FX (1).json` | Creates and manages human-review cases. |
| `Workflow_E_FX (1).json` | Produces correction drafts and supports the resolution follow-up flow. |

## Import

1. In n8n, select **Import from File** and import each JSON workflow.
2. Configure the required credentials and environment variables below.
3. Run `supabase/review_and_resolution.sql` in the Supabase SQL Editor before using the review and resolution workflows.
4. Activate webhook-based workflows only after testing their endpoints.

## Required Configuration

Set these as n8n environment variables or replace the placeholders with n8n credentials/configuration appropriate to your deployment:

| Variable | Purpose |
|---|---|
| `SDOC_API_BASE` | HTTPS base URL for the Docker inbox API. Do not use `localhost` from n8n Cloud. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase service-role key used only inside n8n. |
| `CONVERTAPI_SECRET` | ConvertAPI secret used for DOCX-to-text conversion. |

The workflows also require configured n8n credentials for the selected LLM provider, such as OpenAI.

## Secure Connectivity

When n8n Cloud accesses the Docker API running on a local machine, expose it through an HTTPS tunnel such as Tailscale Funnel. `http://localhost:8080` points to n8n Cloud itself, not the local Docker service.

## Security

The exported workflow files in this repository are sanitized. They contain placeholders instead of the Supabase service-role token and ConvertAPI secret. Never commit real API keys, service-role keys, passwords, webhook secrets, or private attachment URLs.