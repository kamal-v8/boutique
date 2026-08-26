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

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Frontend (temporary, until reverse proxy on 443)"
  }

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

# Key pair

resource "aws_key_pair" "deployer" {
  key_name   = "deployer_key"
  public_key = file(pathexpand("~/.ssh/ec2-key.pub"))
}

# Latest Ubuntu 24.04 AMI (us-east-1) via SSM
data "aws_ssm_parameter" "ubuntu_2404" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
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
apt-get install -y ca-certificates curl gnupg certbot git

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

  # 4. Pull app config and start stack
install -d -o ubuntu -g ubuntu /home/ubuntu/app
curl -fsSLo /home/ubuntu/app/docker-compose-prod.yml https://raw.githubusercontent.com/kamal-v8/boutique/main/docker-compose-prod.yml
curl -fsSLo /home/ubuntu/app/.env https://raw.githubusercontent.com/kamal-v8/boutique/main/.env.example

if [ -n "${var.ghcr_read_token}" ]; then
  echo "${var.ghcr_read_token}" | docker login ghcr.io -u kamal-v8 --password-stdin
fi

cd /home/ubuntu/app
docker compose -f docker-compose-prod.yml up -d
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
