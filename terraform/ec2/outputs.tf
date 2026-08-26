output "instance_public_ip" {
  description = "Public IP of the deploying instance (EIP)"
  value       = aws_eip.deploying_eip.public_ip
}

output "instance_id" {
  description = "ID of the deploying instance"
  value       = aws_instance.deploying.id
}
