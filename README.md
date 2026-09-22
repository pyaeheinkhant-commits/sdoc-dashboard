# SDOC Control Tower

SDOC Control Tower is an AI-assisted shipping-document exception-management prototype. It turns a mixed shipping inbox into a practical operations queue: classify email, compare Shipping Instructions (SI) against draft Bills of Lading (BL), surface discrepancies, and route uncertain cases to human review.

**Live prototype:** https://pyaeheinkhant-commits.github.io/sdoc-dashboard/

**Public workflow canvas:** https://pyaeheinkhant-commits.github.io/sdoc-dashboard/workflow-viewer.html

## What It Does

- Classifies incoming messages as BL comparison, SI request, invoice query, general, or spam.
- Identifies SI and draft BL documents for comparison requests.
- Extracts and compares seven shipping fields: shipper, consignee, notify party, ports of loading and discharge, container count, and gross weight.
- Displays `OK`, `MISMATCH`, and `NEEDS_REVIEW` results in an operational dashboard.
- Shows defect fields, review reasons, and recommended next actions.
- Supports human review decisions, draft correction-message approval, and replacement-document reprocessing through n8n webhooks.

## Technology Used

| Area | Technology | Purpose |
|---|---|---|
| Dashboard | HTML, CSS, JavaScript | Static operations dashboard with no frontend framework or build step. |
| Data | Supabase Postgres + REST API | Stores processed emails, comparisons, review cases, and outbound-message states. |
| Automation | n8n Cloud | Orchestrates classification, document comparison, review, and resolution workflows. |
| AI | OpenAI through n8n | Supports email classification, document interpretation, and structured field extraction. |
| Source data | Docker API | Serves the supplied email dataset and attachments. |
| Secure connectivity | Tailscale Funnel | Gives n8n Cloud HTTPS access to the local Docker API during development. |
| Hosting | GitHub Pages + GitHub Actions | Publishes this static dashboard when `main` changes. |

## Architecture

```text
Docker inbox API -> n8n Cloud -> OpenAI / deterministic comparison -> Supabase
																  |
																  v
														GitHub Pages dashboard
```

n8n handles interpretation and orchestration. Deterministic code handles normalization, required-value checks, numeric weight and container comparisons, status precedence, and final mismatch decisions.

## Repository Structure

```text
.
├── index.html                         # Dashboard markup
├── assets/
│   ├── css/styles.css                  # Dashboard styling
│   └── js/app.js                       # Supabase requests and n8n webhook controls
├── .github/workflows/deploy-pages.yml # GitHub Pages deployment workflow
├── n8n/
│   ├── README.md                        # n8n import and configuration guide
│   ├── workflows/                       # Sanitized n8n workflow exports
│   └── supabase/                        # Supabase review/resolution SQL
└── .nojekyll                          # Serves static assets without Jekyll processing
```

## n8n Workflows

The `n8n` folder contains sanitized exports and setup SQL:

```text
n8n/workflows/
├── Workflow_A_FX (1).json       # Batch classification
├── Workflow_BL.C_FX (1).json    # SI vs. draft BL comparison
├── Workflow_D_FX (1).json       # Human review
└── Workflow_E_FX (1).json       # Resolution follow-up
```

See [n8n/README.md](n8n/README.md) for import steps, required variables, and credential setup.

For a public, interactive read-only version of the n8n canvases, open the [workflow viewer](workflow-viewer.html). It renders the sanitized workflow exports and does not provide access to the live n8n Cloud workspace.

## Run Locally

This is a static site. Serve this folder with any static web server, for example:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/`.

## Deploy

GitHub Actions deploys the dashboard automatically on every push to `main`. The workflow is in `.github/workflows/deploy-pages.yml` and publishes the repository root as a GitHub Pages artifact.

## Security Notes

- The browser uses a Supabase anon key, so Row Level Security must remain enabled and restrict dashboard access to approved read operations.
- Do not place a Supabase service-role key, OpenAI key, n8n credential, or private attachment URL in client-side code.
- Production deployments should protect the dashboard with authentication and keep source documents in private storage with signed URLs.
- External correction messages require human approval; SDOC does not automatically edit shipping documents.

## Prototype Scope

This hackathon prototype demonstrates the end-to-end exception-management workflow. It is not a replacement for production document-control processes, and its metrics and operational impact should be validated with live data before production use.