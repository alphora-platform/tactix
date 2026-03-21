# Deployment Guide

Pipeline tự động deploy lên VPS production khi push vào branch `dev`.

```
push to dev → GitHub Actions → Build Docker images → Push to GHCR → SSH deploy to VPS
```

---

## Yêu cầu

- VPS với Ubuntu 22.04+ và Docker Engine v24+
- Domain trỏ A record về IP của VPS
- GitHub repository (để lưu secrets và GHCR images)

---

## Phần 1: Chuẩn bị VPS (chỉ làm 1 lần)

### 1.1 Cài Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 1.2 Clone repo

```bash
git clone https://github.com/YOUR_USERNAME/tactix.git /opt/tactix
cd /opt/tactix
```

### 1.3 Tạo file `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

Điền đầy đủ các giá trị:

```env
NODE_ENV=production
PORT=5500
APP_URL=https://yourdomain.com

POSTGRES_USER=tactix
POSTGRES_PASSWORD=<mật_khẩu_mạnh>
POSTGRES_DB=tactix

RIOT_API_KEY=RGAPI-xxxx

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

GITHUB_OWNER=your-github-username
GITHUB_REPO=tactix
IMAGE_TAG=latest
```

### 1.4 Cài Certbot và lấy SSL certificate

```bash
# Tạo thư mục certbot webroot
sudo mkdir -p /var/www/certbot

# Cài certbot
sudo apt install -y certbot

# Lấy certificate (domain phải đã trỏ về IP VPS)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your@email.com --agree-tos --non-interactive
```

> **Lưu ý:** Nếu chưa có nginx đang chạy, dùng `--standalone` thay vì `--webroot`:
>
> ```bash
> sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
> ```

### 1.5 Cập nhật nginx config với domain thật

```bash
# Thay yourdomain.com bằng domain thật trong file config
sed -i 's/yourdomain.com/your-actual-domain.com/g' docker/nginx/nginx.prod.conf
```

### 1.6 Đăng nhập GHCR trên VPS

```bash
# Tạo GitHub Personal Access Token tại:
# github.com → Settings → Developer Settings → Personal access tokens → Classic
# Scope cần: read:packages

echo "YOUR_GITHUB_PAT" | docker login ghcr.io \
  -u YOUR_GITHUB_USERNAME --password-stdin
```

### 1.7 Deploy lần đầu thủ công

```bash
cd /opt/tactix
docker compose -f docker/docker-compose.prod.yml up -d
```

Kiểm tra các container đang chạy:

```bash
make prod-status
```

Kiểm tra API hoạt động:

```bash
curl https://yourdomain.com/api/health
```

---

## Phần 2: Cấu hình GitHub Secrets

Vào **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret            | Giá trị                                                     |
| ----------------- | ----------------------------------------------------------- |
| `VPS_HOST`        | IP hoặc hostname của VPS (vd: `123.456.789.0`)              |
| `VPS_USER`        | SSH username (vd: `ubuntu`, `root`)                         |
| `VPS_SSH_KEY`     | Nội dung **private key** SSH (toàn bộ file `~/.ssh/id_rsa`) |
| `VPS_DEPLOY_PATH` | Đường dẫn repo trên VPS (vd: `/opt/tactix`)                 |

### Tạo SSH key cho CI/CD (nếu chưa có)

```bash
# Trên máy local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/tactix_deploy

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/tactix_deploy.pub user@your-vps-ip

# Nội dung VPS_SSH_KEY = nội dung file ~/.ssh/tactix_deploy (private key)
cat ~/.ssh/tactix_deploy
```

---

## Phần 3: Quy trình deploy tự động

Mỗi khi push lên branch `dev`, GitHub Actions chạy 3 jobs tuần tự:

```
[1] test          → nx affected lint + test
[2] build-and-push → Build API + Frontend Docker images → Push to GHCR
[3] deploy        → SSH vào VPS → chạy deploy.sh
```

### deploy.sh làm gì

```
[1] Lưu image tag hiện tại (để rollback nếu cần)
[2] Pull images mới từ GHCR
[3] Chạy database migrations (one-shot container)
[4] Update container api → health check
[5] Update container worker
[6] Update container frontend → health check
[7] Reload nginx
[8] Final health check → rollback nếu fail
[9] Dọn dẹp dangling images
```

**Rollback tự động:** nếu bất kỳ bước nào fail, script tự động restart containers với image tag cũ.

---

## Phần 4: Gia hạn SSL certificate

Certificate Let's Encrypt hết hạn sau 90 ngày. Thêm cron job để tự động gia hạn:

```bash
# Mở crontab
crontab -e

# Thêm dòng này (chạy lúc 3:00 sáng ngày 1 và 15 hàng tháng)
0 3 1,15 * * certbot renew --quiet && docker exec tactix-nginx nginx -s reload
```

---

## Phần 5: Các lệnh thường dùng

```bash
# Xem trạng thái tất cả containers
make prod-status

# Xem logs realtime
make prod-logs

# Xem logs của service cụ thể
docker compose -f docker/docker-compose.prod.yml logs -f api

# Restart API + Worker (không downtime cho frontend)
make prod-restart-api

# Restart Frontend + Nginx
make prod-restart-frontend

# Pull images mới nhất
make prod-pull

# Dừng toàn bộ (KHÔNG xóa volumes)
make prod-down

# SSH vào container để debug
docker exec -it tactix-api sh
docker exec -it tactix-postgres psql -U tactix -d tactix
```

---

## Phần 6: Xử lý sự cố

### Container không start được

```bash
# Xem logs của container bị lỗi
docker logs tactix-api --tail 50
docker logs tactix-postgres --tail 20
```

### Chạy lại migrations thủ công

```bash
cd /opt/tactix
source .env.production

docker run --rm \
  --network tactix-prod_tactix-internal \
  --env-file .env.production \
  -e APP_MODE=migrate \
  -e NODE_ENV=production \
  ghcr.io/${GITHUB_OWNER}/${GITHUB_REPO}/api:latest \
  node dist/main.js
```

### Deploy thủ công (bypass CI)

```bash
cd /opt/tactix
git pull origin dev

GITHUB_OWNER=your-username \
GITHUB_REPO=tactix \
IMAGE_TAG=latest \
bash apps/api/scripts/deploy.sh
```

### Rollback về version cụ thể

```bash
cd /opt/tactix

# Thay <short-sha> bằng 7-char commit SHA muốn rollback về
GITHUB_OWNER=your-username \
GITHUB_REPO=tactix \
IMAGE_TAG=<short-sha> \
bash apps/api/scripts/deploy.sh
```

### Nginx không nhận certificate

```bash
# Kiểm tra certificate còn hạn không
sudo certbot certificates

# Test nginx config
docker exec tactix-nginx nginx -t

# Reload nginx
docker exec tactix-nginx nginx -s reload
```

---

## Kiến trúc

```
Internet
    │
    ▼
[nginx :80/:443]  ← Let's Encrypt SSL
    │
    ├─── /api/* ──────► [api :5500]  (APP_MODE=api)
    │                        │
    └─── /* ─────────► [frontend :80]  (nginx SPA)
                             │
                    [worker]  (APP_MODE=worker, BullMQ)
                        │
                  [postgres] [redis]
```

Tất cả services giao tiếp qua Docker network `tactix-internal` — không có port nào expose ra ngoài ngoại trừ nginx (80, 443).
