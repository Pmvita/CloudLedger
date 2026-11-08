# ✅ CloudLedger — TODO

Progress tracker for the **free MVP** described in [`README.md`](./README.md). Check items off as you go.

If a feature is listed under [Future / Roadmap](#️-future--roadmap-post-mvp), it is **not** part of the first build.

**MVP decisions (locked — keep README in sync if you change these):**

- Free build: local Node API + Docker Compose Postgres + MinIO. **$0.**
- Receipts: API multipart upload → S3 `PutObject` (MinIO locally; real S3 only if you apply the free Terraform)
- Terraform default: `enable_paid_stack = false` (VPC, S3, IAM, SSM, $5 budget only)
- Secrets: `.env` locally; SSM Parameter Store if you apply Terraform — not Secrets Manager
- Networking: **no NAT Gateway**, no ALB, no Fargate, no RDS unless you explicitly opt in
- Auth: `POST /api/auth/register` + `POST /api/auth/login` (JWT)

---

## 💰 Cost guard (do this first)

- [x] Default architecture is local-only (no AWS bill)
- [x] Terraform paid resources gated on `enable_paid_stack` (default `false`)
- [x] Budget default is $5, not $15
- [ ] Create an AWS Budget + email alert **before** any `terraform apply`
- [ ] Do **not** set `enable_paid_stack = true` for this build
- [ ] Do **not** create a NAT Gateway, Secrets Manager secret, ALB, Fargate service, or RDS instance

---

## 🏗️ Project Setup

- [x] Initialize Node.js/TypeScript project structure
- [x] Set up ESLint + Prettier
- [x] Add MIT `LICENSE`
- [x] Create `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `AWS_REGION`, `S3_BUCKET_NAME`, `PORT`)
- [x] Set up local PostgreSQL for development
- [x] Configure PR CI (lint + type-check + build)

---

## 🗄️ Database

- [x] Write migrations for `users` (incl. `password_hash`), `categories`, `expenses`, `receipts`
- [x] Add indexes on `expenses(user_id)`, `expenses(category_id)`, `expenses(expense_date)`
- [x] Seed categories (no create-category API in MVP)
- [x] Seed a sample user + expenses for local testing
- [ ] Run migrate + seed against local Compose Postgres

RDS is **not** in the free MVP. It is behind `enable_paid_stack`.

---

## ⚙️ Backend / API

- [x] Scaffold Node.js REST API server
- [x] `POST /api/auth/register` + `POST /api/auth/login` (JWT)
- [x] JWT auth middleware on expense + category routes
- [x] `GET /api/expenses` — list + filters
- [x] `POST /api/expenses` — create expense; optional multipart receipt
- [x] `GET /api/expenses/:id` — expense + receipt metadata
- [x] `PATCH /api/expenses/:id` — status update
- [x] `DELETE /api/expenses/:id` — delete expense + S3 object
- [x] `GET /api/categories` — list seeded categories
- [x] Zod validation + centralized error handling

---

## 📦 File storage

- [x] Local MinIO in Docker Compose (S3 API)
- [x] Implement `PutObject` / `GetObject` helpers in the API
- [x] On expense delete, delete the matching object
- [ ] Optional Terraform: receipts bucket, block public access, gateway endpoint, 90-day lifecycle (`enable_paid_stack = false` still creates these — S3 at lab volume is $0)

---

## 🐳 Containerization

- [x] Multi-stage production `Dockerfile`
- [ ] Test locally with `docker compose` / `docker run`
- [ ] Do **not** push to ECR on the free build (ECR is paid-stack)

---

## ☁️ AWS Infrastructure (Terraform)

Free stack (default, `$0`):

- [x] VPC: public + private subnets, **no NAT Gateway**
- [x] S3 gateway endpoint
- [x] S3 + IAM receipts policy + SSM `JWT_SECRET` + $5 budget
- [x] `enable_paid_stack` defaults to `false`

Paid stack (do not apply):

- [x] Code exists for ECS Fargate + ALB + RDS + ECR + autoscaling
- [ ] Leave it un-applied

---

## 🔑 IAM & Security

- [x] Managed policy: `s3:PutObject` / `GetObject` / `DeleteObject` on `receipts/*` only
- [x] ECS execution/task roles only created when paid stack is on
- [x] No Secrets Manager

---

## 🧪 Testing & QA

- [x] Unit tests for services/controllers
- [x] Integration tests against local Postgres
- [x] Static demo UI (`public/index.html`): logout, status PATCH, month summary picker, empty/loading states
- [x] Manual QA path documented in README (register → login → create → list → patch status → summary month → delete)

---

## 🚀 Deployment

- [x] Free path documented: local `npm run dev` is the deploy
- [x] Paid deploy workflow is manual and not required
- [x] Rollback for paid stack documented (`terraform destroy`)

---

## 📄 Documentation

- [x] README.md (free-first cost rules, API, IAM)
- [x] TODO.md aligned with free MVP / paid opt-in
- [x] OpenAPI/Swagger for the MVP endpoints
- [x] Short IAM write-up
- [x] CONTRIBUTING.md

---

## 🗺️ Future / Roadmap (post-MVP)

Do not start these until the free MVP above is done. The first item **will bill**.

- [ ] Paid demo: `enable_paid_stack = true` for a few hours (ALB + Fargate + RDS), then destroy
- [ ] Pre-signed S3 upload URLs (`POST /api/receipts/upload-url`)
- [ ] Multi-AZ RDS
- [ ] CloudWatch dashboards + alarms (latency, 5xx, unhealthy tasks)
- [ ] API rate limiting via ALB / WAF
- [ ] Blue/green deployment
- [ ] Move secrets from SSM to Secrets Manager
- [ ] Private ECS tasks + NAT Gateway

---

*Last updated: 2026-11-08*
