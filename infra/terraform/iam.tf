data "aws_kms_alias" "ssm" {
  count = local.paid
  name  = "alias/aws/ssm"
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "receipts" {
  statement {
    sid = "ReceiptObjects"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.receipts.arn}/receipts/*"]
  }
}

# Always created ($0). Attach this when you add compute later.
resource "aws_iam_policy" "receipts" {
  name   = "${var.project_name}-receipts"
  policy = data.aws_iam_policy_document.receipts.json
}

resource "aws_iam_role" "task_execution" {
  count              = local.paid
  name               = "${var.project_name}-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "task_execution" {
  count = local.paid

  statement {
    sid = "EcrAuth"
    # GetAuthorizationToken is not resource-scoped by AWS.
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
    ]
    resources = [aws_ecr_repository.api[0].arn]
  }

  statement {
    sid = "Logs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.api[0].arn}:*"]
  }

  statement {
    sid = "SsmRead"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]
    resources = [
      aws_ssm_parameter.database_url[0].arn,
      aws_ssm_parameter.jwt_secret.arn,
    ]
  }

  statement {
    sid       = "DecryptSsm"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.ssm[0].target_key_arn]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "task_execution" {
  count  = local.paid
  name   = "execution"
  role   = aws_iam_role.task_execution[0].id
  policy = data.aws_iam_policy_document.task_execution[0].json
}

resource "aws_iam_role" "task" {
  count              = local.paid
  name               = "${var.project_name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "task" {
  count  = local.paid
  name   = "receipts"
  role   = aws_iam_role.task[0].id
  policy = data.aws_iam_policy_document.receipts.json
}
