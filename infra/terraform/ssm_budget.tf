resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  count       = local.paid
  name        = "/cloudledger/DATABASE_URL"
  description = "Postgres connection string for the API"
  type        = "SecureString"
  value       = "postgres://${var.db_username}:${random_password.db[0].result}@${aws_db_instance.postgres[0].address}:5432/${var.db_name}"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/cloudledger/JWT_SECRET"
  description = "JWT signing secret"
  type        = "SecureString"
  value       = random_password.jwt.result
}

resource "aws_budgets_budget" "lab" {
  name         = "${var.project_name}-monthly"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }
}
