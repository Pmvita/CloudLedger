variable "aws_region" {
  type        = string
  description = "AWS region for the lab stack."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Name prefix for resources."
  default     = "cloudledger"
}

variable "enable_paid_stack" {
  type        = bool
  default     = false
  description = "When true, create ALB + ECS Fargate + RDS + ECR. Those are not free. Leave false for the $0 lab (VPC, S3, SSM, budget only). Local docker-compose is the MVP compute/database."
}

variable "budget_email" {
  type        = string
  description = "Email for the AWS Budget alarm. Required even for the free stack."
}

variable "monthly_budget_usd" {
  type        = string
  description = "Monthly cost budget in USD. Keep this low; the free stack should stay near $0."
  default     = "5"
}

variable "db_username" {
  type        = string
  description = "RDS master username."
  default     = "cloudledger"
}

variable "db_name" {
  type        = string
  description = "RDS database name."
  default     = "cloudledger"
}

variable "container_port" {
  type        = number
  default     = 4000
}

variable "desired_count" {
  type        = number
  default     = 1
}

variable "min_task_count" {
  type        = number
  default     = 1
}

variable "max_task_count" {
  type        = number
  default     = 3
}

variable "cpu_target_percent" {
  type        = number
  default     = 70
}

variable "image_tag" {
  type        = string
  description = "ECR image tag for the API task. Push an image before the service will stabilize."
  default     = "latest"
}
