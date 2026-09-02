# VPC & Networking

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "deploying-vpc" }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "deploying-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = { Name = "public-subnet" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Groups

resource "aws_security_group" "ec2_sg" {
  name        = "ec2-inbound-${var.environment}"
  description = "allow http/s and ssh"
  vpc_id      = aws_vpc.main.id

  ingress {
    to_port     = 22
    from_port   = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
    description = "SSH"
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # ingress {
  #   from_port   = 8080
  #   to_port     = 8080
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  #   description = "Frontend (temporary, until reverse proxy on 443)"
  # }
  #
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }
}
resource "aws_iam_role" "ssm" {
  name = "ec2-deploying-ssm-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm" {
  name = "ec2-deploying-ssm-${var.environment}"
  role = aws_iam_role.ssm.name
}

resource "aws_iam_role_policy" "ssm_params_read" {
  name = "ssm-params-read-${var.environment}"
  role = aws_iam_role.ssm.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:DescribeParameters"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}/${var.environment}",
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}/${var.environment}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:DescribeKey"]
        Resource = aws_kms_key.boutique.arn
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Backups bucket is owned by backend-bootstarp/ (so `terraform destroy` in ec2/ doesn't delete backups)
data "aws_s3_bucket" "backups" {
  bucket = "boutique-backups-${data.aws_caller_identity.current.account_id}"
}

# s3 write permission
resource "aws_iam_role_policy_attachment" "s3_backups" {
  role       = aws_iam_role.ssm.name
  policy_arn = aws_iam_policy.s3_backups.arn
}

resource "aws_iam_policy" "s3_backups" {
  name = "boutique-s3-backups"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
      Resource = [
        data.aws_s3_bucket.backups.arn,
        "${data.aws_s3_bucket.backups.arn}/*"
      ]
    }]
  })
}
# Key pair

resource "aws_key_pair" "deployer" {
  key_name   = "deployer_key"
  public_key = file(pathexpand("~/.ssh/ec2-key.pub"))
}

# Latest Ubuntu 24.04 AMI (us-east-1) via SSM
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
data "aws_ssm_parameter" "ubuntu_2404" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

resource "aws_kms_key" "boutique" {
  description             = "boutique /${var.environment} SSM params"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = { Name = "boutique-kms-${var.environment}" }
}
resource "aws_kms_alias" "boutique" {
  name          = "alias/boutique-${var.environment}"
  target_key_id = aws_kms_key.boutique.key_id
}
resource "aws_ssm_parameter" "jwt_secret" {
  name   = "${var.ssm_prefix}/${var.environment}/jwt_secret"
  type   = "SecureString"
  key_id = aws_kms_key.boutique.arn
  value  = var.jwt_secret
  tags   = { Environment = var.environment }
}
resource "aws_ssm_parameter" "postgres_password" {
  name   = "${var.ssm_prefix}/${var.environment}/postgres_password"
  type   = "SecureString"
  key_id = aws_kms_key.boutique.arn
  value  = var.postgres_password
  tags   = { Environment = var.environment }
}
resource "aws_ssm_parameter" "admin_password" {
  name   = "${var.ssm_prefix}/${var.environment}/admin_password"
  type   = "SecureString"
  key_id = aws_kms_key.boutique.arn
  value  = var.admin_password
  tags   = { Environment = var.environment }
}
resource "aws_ssm_parameter" "demo_password" {
  name   = "${var.ssm_prefix}/${var.environment}/demo_password"
  type   = "SecureString"
  key_id = aws_kms_key.boutique.arn
  value  = var.demo_password
  tags   = { Environment = var.environment }
}
resource "aws_ssm_parameter" "cf_dns_api_token" {
  name   = "${var.ssm_prefix}/${var.environment}/cf_dns_api_token"
  type   = "SecureString"
  key_id = aws_kms_key.boutique.arn
  value  = var.cf_dns_api_token
  tags   = { Environment = var.environment }
}
resource "aws_ssm_parameter" "postgres_user" {
  name  = "${var.ssm_prefix}/${var.environment}/postgres_user"
  type  = "String"
  value = var.postgres_user
  tags  = { Environment = var.environment }
}
resource "aws_ssm_parameter" "postgres_db" {
  name  = "${var.ssm_prefix}/${var.environment}/postgres_db"
  type  = "String"
  value = var.postgres_db
  tags  = { Environment = var.environment }
}
resource "aws_ssm_parameter" "admin_email" {
  name  = "${var.ssm_prefix}/${var.environment}/admin_email"
  type  = "String"
  value = var.admin_email
  tags  = { Environment = var.environment }
}
resource "aws_ssm_parameter" "demo_email" {
  name  = "${var.ssm_prefix}/${var.environment}/demo_email"
  type  = "String"
  value = var.demo_email
  tags  = { Environment = var.environment }
}
resource "aws_ssm_parameter" "acme_email" {
  name  = "${var.ssm_prefix}/${var.environment}/acme_email"
  type  = "String"
  value = var.acme_email
  tags  = { Environment = var.environment }
}
# EC2 instance
resource "aws_instance" "deploying" {
  iam_instance_profile   = aws_iam_instance_profile.ssm.name
  ami                    = data.aws_ssm_parameter.ubuntu_2404.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  key_name               = aws_key_pair.deployer.key_name

  root_block_device {
    encrypted = true
  }

  metadata_options {
    http_tokens = "required"
  }

  user_data_replace_on_change = true
  user_data                   = <<-EOF
#!/bin/bash
set -ex

# 1. Update and install basic dependencies
apt-get update -y
apt-get install -y ca-certificates curl gnupg certbot git jq unzip

# 1b. Install AWS CLI v2 (bundled installer — the `awscli` apt package has no candidate on Ubuntu 24.04)
if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/aws
fi

# 2. Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Setup user permissions
usermod -aG docker ubuntu

# 4. Pull app config and build .env from SSM Parameter Store (SecureString via custom KMS)
install -d -o ubuntu -g ubuntu /home/ubuntu/app
curl -fsSLo /home/ubuntu/app/docker-compose-prod.yml https://raw.githubusercontent.com/kamal-v8/boutique/main/docker-compose-prod.yml

SSM_PREFIX="${var.ssm_prefix}/${var.environment}"
REGION="${data.aws_region.current.name}"
ENV_FILE=/home/ubuntu/app/.env

# Fetch all params under prefix in one call (with decryption) — retries for IAM eventual consistency
for i in 1 2 3 4 5; do
  if PARAMS_JSON=$(aws ssm get-parameters-by-path --path "$SSM_PREFIX" --with-decryption --recursive --region "$REGION" --output json 2>&1); then
    break
  fi
  echo "ssm get-parameters-by-path failed (attempt $i): $PARAMS_JSON" >&2
  sleep $((i * 5))
done

get_val() {
  echo "$PARAMS_JSON" | jq -r --arg n "$SSM_PREFIX/$1" '.Parameters[] | select(.Name==$n) | .Value'
}

cat > "$ENV_FILE" <<ENVEOF
POSTGRES_USER=$(get_val postgres_user)
POSTGRES_PASSWORD=$(get_val postgres_password)
POSTGRES_DB=$(get_val postgres_db)
JWT_SECRET=$(get_val jwt_secret)
ADMIN_EMAIL=$(get_val admin_email)
ADMIN_PASSWORD=$(get_val admin_password)
DEMO_EMAIL=$(get_val demo_email)
DEMO_PASSWORD=$(get_val demo_password)
CF_DNS_API_TOKEN=$(get_val cf_dns_api_token)
ACME_EMAIL=$(get_val acme_email)
ENVEOF
chmod 600 "$ENV_FILE"
chown ubuntu:ubuntu "$ENV_FILE"

# Verify no empty values (fail fast if SSM not populated)
if grep -q '=$' "$ENV_FILE"; then
  echo "ERROR: Some SSM parameters empty — check ${var.ssm_prefix}/${var.environment}/*" >&2
  cat "$ENV_FILE" | sed 's/=.*/=***redacted***/'
  exit 1
fi

if [ -n "${var.ghcr_read_token}" ]; then
  echo "${var.ghcr_read_token}" | docker login ghcr.io -u kamal-v8 --password-stdin
fi

install -d -o ubuntu -g ubuntu /home/ubuntu/traefik
touch /home/ubuntu/traefik/acme.json
chmod 600 /home/ubuntu/traefik/acme.json
cd /home/ubuntu/app
docker compose -f docker-compose-prod.yml up -d

# Download backup script and schedule daily 12:00 UTC backup
curl -fsSLo /home/ubuntu/app/backup.sh https://raw.githubusercontent.com/kamal-v8/boutique/main/scripts/backup.sh
chmod +x /home/ubuntu/app/backup.sh

# Append (not replace) so we don't clobber any existing crontab entries
( crontab -l 2>/dev/null; echo "0 12 * * * /home/ubuntu/app/backup.sh >> /var/log/boutique-backup.log 2>&1" ) | crontab -

EOF

  tags = { Name = "EC2 Deploying" }
}

# Elastic IP
resource "aws_eip" "deploying_eip" {
  domain = "vpc"
  tags   = { Name = "deploying-eip" }
}

# Elastic IP Association
resource "aws_eip_association" "deploying_eip_association" {
  instance_id   = aws_instance.deploying.id
  allocation_id = aws_eip.deploying_eip.id
}

# Cloudflare DNS — auto-updates when EIP changes (terraform apply handles it)
resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = aws_eip.deploying_eip.public_ip
  type    = "A"
  proxied = false
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = aws_eip.deploying_eip.public_ip
  type    = "A"
  proxied = false
  ttl     = 1
}
