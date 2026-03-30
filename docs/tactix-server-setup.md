# Hướng Dẫn Setup VPS Production — Tactix

> Stack: Ubuntu 24.04 LTS · Docker · Nginx · Let's Encrypt · NestJS + React

---

## Mục lục

1. [Bảo mật server lần đầu](#1-bảo-mật-server-lần-đầu)
2. [Cài đặt các công cụ cần thiết](#2-cài-đặt-các-công-cụ-cần-thiết)
3. [Cấu hình Firewall (UFW)](#3-cấu-hình-firewall-ufw)
4. [Cài đặt Docker & Docker Compose](#4-cài-đặt-docker--docker-compose)
5. [Cấu hình Nginx Reverse Proxy](#5-cấu-hình-nginx-reverse-proxy)
6. [SSL/TLS với Let's Encrypt](#6-ssltls-với-lets-encrypt)
7. [Deploy ứng dụng với Docker Compose](#7-deploy-ứng-dụng-với-docker-compose)
8. [Monitoring & Logging cơ bản](#8-monitoring--logging-cơ-bản)
9. [Checklist trước khi go-live](#9-checklist-trước-khi-go-live)

---

## 1. Bảo mật server lần đầu

Đây là bước quan trọng nhất. Root bị compromise = mất tất cả.

### 1.1 Tạo user mới, không dùng root

```bash
# Đăng nhập với root lần đầu
ssh root@<VPS_IP>

# Tạo user mới
adduser khoa
usermod -aG sudo khoa

# Chuyển sang user mới để kiểm tra
su - khoa
sudo whoami  # Phải ra "root"
```

### 1.2 Cấu hình SSH key (bắt buộc, không dùng password)

Trên máy local (Windows/WSL):

```bash
# Tạo SSH key nếu chưa có
ssh-keygen -t ed25519 -C "tactix-vps"

# Copy public key lên server
ssh-copy-id -i ~/.ssh/id_ed25519.pub khoa@<VPS_IP>

# Kiểm tra login bằng key
ssh khoa@<VPS_IP>
```

### 1.3 Tắt đăng nhập bằng password và root SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Tìm và chỉnh các dòng sau:

```
Port 2222                    # Đổi port khác, tránh scan port 22
PermitRootLogin no           # Cấm root login
PasswordAuthentication no    # Chỉ dùng key
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

```bash
sudo systemctl restart sshd

# Mở terminal mới, test login trước khi đóng terminal cũ
ssh -p 2222 khoa@<VPS_IP>
```

> ⚠️ **Không đóng terminal đang dùng** cho đến khi xác nhận terminal mới login được. Nếu lock out, cần dùng VPS console của nhà cung cấp.

### 1.4 Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

---

## 2. Cài đặt các công cụ cần thiết

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  htop \
  unzip \
  net-tools \
  fail2ban \
  logrotate
```

### 2.1 Cấu hình Fail2ban (chặn brute force SSH)

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Tìm section `[sshd]` và chỉnh:

```ini
[sshd]
enabled = true
port    = 2222          # Phải khớp với port SSH đã đổi
maxretry = 5
bantime  = 3600         # Ban 1 giờ
findtime = 600
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 3. Cấu hình Firewall (UFW)

```bash
# Mặc định deny all inbound, allow all outbound
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Mở port SSH (port đã đổi)
sudo ufw allow 2222/tcp

# Mở HTTP và HTTPS cho Nginx
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bật firewall
sudo ufw enable

# Kiểm tra
sudo ufw status verbose
```

> **Không mở port database (5432), Redis (6379) ra ngoài**. Các service đó chỉ giao tiếp nội bộ qua Docker network.

---

## 4. Cài đặt Docker & Docker Compose

```bash
# Xóa version cũ nếu có
sudo apt remove docker docker-engine docker.io containerd runc

# Cài dependencies
sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Thêm user vào group docker (không cần sudo mỗi lần)
sudo usermod -aG docker khoa
newgrp docker

# Kiểm tra
docker --version
docker compose version
```

### 4.1 Cấu hình Docker daemon

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

```bash
sudo systemctl restart docker
sudo systemctl enable docker
```

---

## 5. Cấu hình Nginx Reverse Proxy

Nginx chạy trực tiếp trên host (không trong Docker) để dễ quản lý SSL certificate.

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 5.1 Cấu trúc thư mục

```
/etc/nginx/
├── nginx.conf                  # Config gốc, không sửa nhiều
├── sites-available/
│   └── tactix.conf             # Config cho Tactix
└── sites-enabled/
    └── tactix.conf -> ...      # Symlink
```

### 5.2 Tạo config ban đầu (HTTP trước, HTTPS sau khi có cert)

```bash
sudo nano /etc/nginx/sites-available/tactix.conf
```

```nginx
# Redirect www về non-www
server {
    listen 80;
    server_name www.tactix.gg;
    return 301 https://tactix.gg$request_uri;
}

server {
    listen 80;
    server_name tactix.gg;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Frontend (React SPA)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout cho long-running requests (analytics)
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
```

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/tactix.conf /etc/nginx/sites-enabled/

# Xóa default site
sudo rm /etc/nginx/sites-enabled/default

# Kiểm tra config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## 6. SSL/TLS với Let's Encrypt

```bash
# Cài Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy certificate (Certbot tự sửa Nginx config)
sudo certbot --nginx -d tactix.gg -d www.tactix.gg

# Điền email, đồng ý ToS, chọn redirect HTTP → HTTPS
```

### 6.1 Kiểm tra auto-renew

Let's Encrypt cert hết hạn sau 90 ngày, Certbot tự renew qua systemd timer:

```bash
# Kiểm tra timer
sudo systemctl status certbot.timer

# Test dry-run renew
sudo certbot renew --dry-run
```

### 6.2 Hardening SSL (sau khi có cert)

Thêm vào block `server` lắng nghe port 443 trong Nginx:

```nginx
# Chỉ dùng TLS 1.2 và 1.3
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Giảm info leak
server_tokens off;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Deploy ứng dụng với Docker Compose

### 7.1 Cấu trúc thư mục trên server

```bash
mkdir -p /home/khoa/tactix/{data/postgres,data/redis,logs}
```

```
/home/khoa/tactix/
├── docker-compose.prod.yml
├── .env.prod                   # Secrets — KHÔNG commit lên git
├── data/
│   ├── postgres/               # PostgreSQL data volume
│   └── redis/                  # Redis data volume
└── logs/
```

### 7.2 File `.env.prod`

```bash
nano /home/khoa/tactix/.env.prod
chmod 600 /home/khoa/tactix/.env.prod   # Chỉ owner đọc được
```

```env
# Database
DATABASE_URL=postgresql://tactix_user:StrongPasswordHere@postgres:5432/tactix_db
POSTGRES_USER=tactix_user
POSTGRES_PASSWORD=StrongPasswordHere
POSTGRES_DB=tactix_db

# Redis
REDIS_URL=redis://redis:6379

# App
NODE_ENV=production
API_PORT=4000
FRONTEND_PORT=3000
JWT_SECRET=your-256-bit-secret-here

# Riot API
RIOT_API_KEY=RGAPI-xxx

# Supabase (nếu dùng)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

### 7.3 `docker-compose.prod.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env.prod
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - ./data/redis:/data
    networks:
      - internal
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/khoadev/tactix-api:latest # Hoặc build trực tiếp
    restart: unless-stopped
    env_file: .env.prod
    ports:
      - '127.0.0.1:4000:4000' # Chỉ bind localhost, Nginx mới vào được
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy && node dist/main.js"

  frontend:
    image: ghcr.io/khoadev/tactix-web:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:3000:80' # Nginx reverse proxy vào đây
    networks:
      - internal

networks:
  internal:
    driver: bridge
```

> **Quan trọng**: Port binding `127.0.0.1:PORT:PORT` thay vì `PORT:PORT`. Điều này đảm bảo container chỉ accessible từ localhost (Nginx), không bị expose trực tiếp ra internet dù firewall có vấn đề.

### 7.4 Deploy lần đầu

```bash
cd /home/khoa/tactix

# Pull images
docker compose -f docker-compose.prod.yml pull

# Chạy
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

### 7.5 Update ứng dụng (zero-downtime đơn giản)

```bash
# Pull image mới
docker compose -f docker-compose.prod.yml pull api

# Restart chỉ service api
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Kiểm tra
docker compose -f docker-compose.prod.yml ps
```

---

## 8. Monitoring & Logging cơ bản

### 8.1 Xem logs realtime

```bash
# Tất cả services
docker compose -f docker-compose.prod.yml logs -f

# Chỉ API
docker compose -f docker-compose.prod.yml logs -f api

# Nginx access log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.2 Kiểm tra tài nguyên

```bash
# Realtime resource usage của containers
docker stats

# System overview
htop

# Disk usage
df -h
docker system df    # Docker disk usage
```

### 8.3 Dọn dẹp Docker định kỳ

```bash
# Xóa images cũ, containers stopped, networks không dùng
docker system prune -f

# Thêm vào crontab (chạy hàng tuần)
crontab -e
# Thêm dòng: 0 3 * * 0 docker system prune -f >> /home/khoa/tactix/logs/docker-prune.log 2>&1
```

### 8.4 Backup database

```bash
nano /home/khoa/tactix/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/khoa/tactix/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose -f /home/khoa/tactix/docker-compose.prod.yml exec -T postgres \
  pg_dump -U tactix_user tactix_db | gzip > "$BACKUP_DIR/tactix_$DATE.sql.gz"

# Giữ 7 bản gần nhất
ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs -r rm

echo "Backup done: tactix_$DATE.sql.gz"
```

```bash
chmod +x /home/khoa/tactix/backup-db.sh

# Crontab: backup hàng ngày lúc 2AM
crontab -e
# 0 2 * * * /home/khoa/tactix/backup-db.sh >> /home/khoa/tactix/logs/backup.log 2>&1
```

---

## 9. Checklist trước khi go-live

### Bảo mật

- [ ] Root SSH login bị tắt
- [ ] Password authentication SSH bị tắt
- [ ] SSH port đã đổi (không dùng 22)
- [ ] UFW đang chạy, chỉ mở 2222/80/443
- [ ] Fail2ban đang chạy
- [ ] File `.env.prod` có quyền `600`
- [ ] Không có secrets trong Docker image hoặc git

### Infrastructure

- [ ] Docker daemon có log rotation
- [ ] Containers bind `127.0.0.1` thay vì `0.0.0.0`
- [ ] Database và Redis không expose port ra ngoài
- [ ] SSL certificate đã cài, auto-renew hoạt động
- [ ] Nginx redirect HTTP → HTTPS

### Ứng dụng

- [ ] `NODE_ENV=production`
- [ ] Prisma migrate chạy khi deploy
- [ ] Health check endpoint hoạt động: `curl https://tactix.gg/api/health`
- [ ] CORS chỉ allow domain chính thức
- [ ] Rate limiting đã bật trên API

### Operational

- [ ] Backup database đã setup và test restore được
- [ ] Biết cách rollback: `docker compose up -d --no-deps api` với image cũ
- [ ] Log rotation cấu hình cho cả Nginx lẫn Docker

---

## Phụ lục: Lệnh thường dùng

```bash
# SSH vào server
ssh -p 2222 khoa@<VPS_IP>

# Restart toàn bộ stack
docker compose -f docker-compose.prod.yml restart

# Xem status các container
docker compose -f docker-compose.prod.yml ps

# Vào shell trong container (debug)
docker compose -f docker-compose.prod.yml exec api sh

# Chạy prisma studio tạm thời (qua SSH tunnel, không mở port)
# Trên local: ssh -p 2222 -L 5555:localhost:5555 khoa@<VPS_IP>
# Trên server: docker compose exec api npx prisma studio

# Reload Nginx không downtime
sudo nginx -t && sudo systemctl reload nginx

# Kiểm tra cert còn hạn bao lâu
sudo certbot certificates
```
