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
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for zaptor.in (find in dashboard → Overview → right sidebar)"
  type        = string
}

variable "domain_name" {
  description = "Apex domain name"
  type        = string
  default     = "zaptor.in"
}

