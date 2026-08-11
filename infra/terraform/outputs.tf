output "web_url" {
  value = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "api_url" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "data_bucket" {
  value = aws_s3_bucket.data.id
}

output "web_bucket" {
  value = aws_s3_bucket.web.id
}
