# Contributing

## Local loop (free — this is the MVP)

1. Copy `.env.example` to `.env`.
2. `docker compose up -d` (Postgres + MinIO).
3. `npm install`
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`

Demo login after seed: `demo@cloudledger.dev` / `Password123!`

Do not put real AWS keys in `.env`. MinIO is the S3 endpoint.

## Checks before a PR

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Database integration tests run when `RUN_DB_TESTS=1` (CI sets this against the Postgres service).

## Scope

MVP is the **free local build**. Do not start roadmap items, and do not apply ALB / Fargate / RDS.

## AWS

- `enable_paid_stack` stays `false`.
- Create a budget alarm before any `terraform apply`.
- Never add a NAT Gateway or Secrets Manager secret.
- The paid stack bills while it exists. If you turn it on for a demo, destroy it the same day.
