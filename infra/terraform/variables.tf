variable "project_name" {
  type    = string
  default = "cloudspend-ai"
}

variable "environment" {
  type    = string
  default = "demo"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "lambda_image_uri" {
  type        = string
  description = "Immutable ECR image URI for backend/Dockerfile.lambda."
}

variable "allowed_origins" {
  type    = list(string)
  default = ["*"]
}
