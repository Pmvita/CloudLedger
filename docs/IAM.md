# IAM write-up

The **free build does not use AWS IAM**. The API talks to MinIO with the keys in `.env`.

Terraform still defines a scoped **receipts policy** ($0) so a later compute role can attach it. ECS roles below exist only when `enable_paid_stack = true` (not the free build). RDS is not used in the free build; on the paid stack it is reached with a password from SSM and a security group, not IAM database auth.

## Receipts policy (`cloudledger-receipts`) — free stack

| Action                                        | Resource                           |
| --------------------------------------------- | ---------------------------------- |
| `s3:PutObject` / `GetObject` / `DeleteObject` | `arn:aws:s3:::<bucket>/receipts/*` |

No `s3:ListBucket`. No other buckets.

## Task execution role (`cloudledger-task-execution`) — paid stack only

Used by the ECS agent, not by application code.

| Action                                    | Resource                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `ecr:GetAuthorizationToken`               | `*` (AWS does not resource-scope this call)               |
| `ecr:BatchGetImage` and related pull APIs | This ECR repository only                                  |
| `logs:CreateLogStream` / `PutLogEvents`   | `/ecs/cloudledger` only                                   |
| `ssm:GetParameter` / `GetParameters`      | `/cloudledger/DATABASE_URL` and `/cloudledger/JWT_SECRET` |
| `kms:Decrypt`                             | Default `alias/aws/ssm` key, only via SSM in this region  |

This role cannot read or write receipt objects.

## Task role (`cloudledger-task`) — paid stack only

Assumed by the Node process. Same S3 actions as the receipts policy above. Access keys are not injected; Fargate supplies temporary credentials.

## Security groups (network IAM)

Created with the VPC (they cost $0). They only carry traffic if you opt into the paid stack.

| Direction       | Rule         |
| --------------- | ------------ |
| Internet → ALB  | TCP 80       |
| ALB → ECS tasks | TCP 4000     |
| ECS tasks → RDS | TCP 5432     |
| RDS             | No public IP |

No NAT Gateway. The S3 gateway endpoint is the one free VPC endpoint.

## What is intentionally not in the free MVP

- IAM auth to RDS (`rds-db:connect`)
- Secrets Manager
- Long-lived access keys in the container
- A role that can describe or mutate IAM, ECS, or RDS
