variable "environment" {
  description = "Environment name used for tagging and resource naming"
  type        = string
  default     = "dev"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "c7i-flex.large"
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to reach port 22 (e.g. your.ip.add.ress/32)"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.ssh_allowed_cidr))
    error_message = "Must be a valid CIDR block, e.g. 49.37.170.196/32."
  }
}

variable "ghcr_read_token" {
  description = "GitHub PAT with read:packages to pull private ghcr.io images (empty if packages are public)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS:Edit for the zaptor.in zone"
  type        = string
  sensitive   = true
  # Dummy passes provider regex so `terraform destroy` without vars doesn't fail validation;
  # real `apply` must override via tfvars/TF_VAR with a valid token, otherwise Cloudflare API will 401.
  # default = "0000000000000000000000000000000000000000"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for zaptor.in (find in dashboard → Overview → right sidebar)"
  type        = string
  # default     = "0000000000000000000000000000000000000000"
}

variable "domain_name" {
  description = "Apex domain name"
  type        = string
  default     = "zaptor.in"
}

variable "ssm_prefix" {
  description = "Prefix for SSM Parameter Store paths (full path = prefix/env/key)"
  type        = string
  default     = "/boutique"
}

variable "postgres_user" {
  description = "Postgres user"
  type        = string
  default     = "boutique"
}

variable "postgres_db" {
  description = "Postgres DB name"
  type        = string
  default     = "boutique"
}

variable "postgres_password" {
  description = "Postgres password (SecureString)"
  type        = string
  sensitive   = true
  # default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret (SecureString)"
  type        = string
  sensitive   = true
  # default     = ""
}

variable "admin_email" {
  description = "Seeded admin email"
  type        = string
  default     = "admin@zaptor.in"
}

variable "admin_password" {
  description = "Seeded admin password (SecureString)"
  type        = string
  sensitive   = true
  # default     = ""
}

variable "demo_email" {
  description = "Demo user email"
  type        = string
  default     = "demo@zaptor.in"
}

variable "demo_password" {
  description = "Demo user password (SecureString)"
  type        = string
  sensitive   = true
  # default     = ""
}

variable "acme_email" {
  description = "ACME email for Let's Encrypt"
  type        = string
  default     = "you@zaptor.in"
}

variable "cf_dns_api_token" {
  description = "Cloudflare DNS API token for Traefik (SecureString, stored as /boutique/dev/cf_dns_api_token)"
  type        = string
  sensitive   = true
  # default     = ""
}
