output "deploy_mode" {
  value = var.enable_paid_stack ? "paid (ALB + Fargate + RDS)" : "free (VPC + S3 + SSM + budget)"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.receipts.bucket
}

output "alb_dns_name" {
  description = "Set only when enable_paid_stack = true."
  value       = try(aws_lb.api[0].dns_name, null)
}

output "ecr_repository_url" {
  value = try(aws_ecr_repository.api[0].repository_url, null)
}

output "rds_endpoint" {
  description = "Private RDS hostname — not reachable from the public internet."
  value       = try(aws_db_instance.postgres[0].address, null)
}

output "ecs_cluster_name" {
  value = try(aws_ecs_cluster.main[0].name, null)
}

output "ecs_service_name" {
  value = try(aws_ecs_service.api[0].name, null)
}
