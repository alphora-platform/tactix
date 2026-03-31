# Deployment Guide — Tactix

Pipeline tự động deploy lên VPS khi push vào branch `dev`.

```
push to dev → GitHub Actions → Build Docker images → Push GHCR → SSH deploy to VPS
```

## Kiến trúc production

```
Internet
    │
    ▼
[Nginx :80/:443]  ← chạy trực tiếp trên VPS host, Let's Encrypt SSL
    │
    ├── /api/* ──► [tactix-api :5500]     (APP_MODE=api, Docker)
    │
    └── /* ──────► [tactix-frontend :3000] (React SPA nginx, Docker)
                        │
               [tactix-worker]  (APP_MODE=worker, BullMQ, Docker)
                        │
               [tactix-postgres] [tactix-redis]  (Docker, internal only)
```

- **Nginx** chạy trên host, quản lý SSL và reverse proxy
- **API + Frontend + Worker + DB + Redis** chạy trong Docker (network `tactix-internal`)
- API và Frontend chỉ bind `127.0.0.1` — không expose trực tiếp ra internet

---

## Phần 1: Chuẩn bị VPS (chỉ làm 1 lần)

> Xem `docs/tactix-server-setup.md` để setup bảo mật server, firewall, fail2ban trước.

### 1.1 Cài Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 1.2 Cài Nginx trên host

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 1.3 Cấu hình Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/tactix.conf
```

Dán nội dung từ `docker/nginx/nginx.prod.conf` (đã có domain `tactix.gg` và các security headers).

```bash
sudo ln -s /etc/nginx/sites-available/tactix.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 1.4 Lấy SSL certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot

# Lấy cert — certbot tự sửa nginx config thêm SSL
sudo certbot --nginx -d tactixtft.site -d www.tactixtft.site
```

Kiểm tra auto-renew:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### 1.5 Clone repo

```bash
git clone https://github.com/YOUR_USERNAME/tactix.git /opt/tactix
cd /opt/tactix
```

### 1.6 Tạo `.env.production`

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Các biến bắt buộc:

```env
NODE_ENV=production
PORT=5500

POSTGRES_USER=tactix
POSTGRES_PASSWORD=<mật_khẩu_mạnh>
POSTGRES_DB=tactix

REDIS_HOST=redis
REDIS_PORT=6379

RIOT_API_KEY=RGAPI-xxxx
ADMIN_API_KEY=<random_secret>

JWT_SECRET=<256-bit_secret>
JWT_EXPIRES_IN=7d

APP_URL=https://tactix.gg
CORS_ORIGINS=https://tactix.gg,https://www.tactix.gg

GITHUB_OWNER=your-github-username
GITHUB_REPO=tactix
IMAGE_TAG=latest
```

### 1.7 Đăng nhập GHCR

```bash
# GitHub PAT với scope read:packages
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 1.8 Deploy lần đầu thủ công

```bash
cd /opt/tactix
make prod-up
```

Kiểm tra:

```bash
make prod-status
curl https://tactix.gg/api/health
```

---

## Phần 2: Cấu hình GitHub Secrets

Vào **GitHub repo → Settings → Secrets and variables → Actions**:

Tạo các **repository secrets** sau:

| Secret        | Giá trị                                                |
| ------------- | ------------------------------------------------------ |
| `VPS_HOST`    | IP hoặc hostname của VPS                               |
| `VPS_USER`    | SSH username (vd: `khoa`)                              |
| `VPS_SSH_KEY` | Nội dung private key SSH (toàn bộ `~/.ssh/id_ed25519`) |

Tạo thêm **repository variable** sau:

| Variable          | Giá trị                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `VPS_DEPLOY_PATH` | Repo root trên VPS, phải tồn tại sẵn và chứa `.git` (vd: `/project/tactix`) |

Tạo SSH key riêng cho CI/CD:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/tactix_deploy
ssh-copy-id -i ~/.ssh/tactix_deploy.pub khoa@<VPS_IP>
cat ~/.ssh/tactix_deploy   # → copy vào VPS_SSH_KEY secret
```

`VPS_DEPLOY_PATH` giờ được lưu dưới dạng GitHub Actions Variable thay vì secret để dễ debug hơn. Biến này phải trỏ đúng vào thư mục root của repo đã clone trên VPS. Nếu thư mục không tồn tại hoặc không phải git repo, workflow sẽ dừng ngay ở bước SSH.

Nếu bạn chắc chắn path đúng nhưng workflow vẫn báo `cd: no such file or directory`, kiểm tra lại secret này có bị dính ký tự ẩn như `\r` hoặc dấu cách ở cuối chuỗi hay không. Path này không nhạy cảm, nên có thể chuyển sang GitHub Actions Variable để dễ debug hơn thay vì lưu dưới dạng secret.

---

## Phần 3: Quy trình deploy tự động

Mỗi khi push lên `dev`, GitHub Actions chạy 3 jobs:

```
[1] test           → nx affected lint + test
[2] build-and-push → Build API + Frontend Docker images → Push GHCR
[3] deploy         → SSH vào VPS → chạy deploy.sh
```

### deploy.sh làm gì

```
[1] Lưu image tag hiện tại (để rollback)
[2] Pull images mới từ GHCR
[3] Chạy database migrations (one-shot container)
[4] Update API container → wait healthy
[5] Update Worker container
[6] Update Frontend container → wait healthy
[7] sudo systemctl reload nginx
[8] Final health check → rollback tự động nếu fail
[9] Dọn dẹp dangling images
```

---

## Phần 4: SSL certificate tự động gia hạn

Certbot đã có systemd timer tự renew. Sau khi renew cần reload nginx:

```bash
crontab -e
# Thêm: chạy lúc 3:00 sáng ngày 1 và 15 hàng tháng
0 3 1,15 * * certbot renew --quiet && sudo systemctl reload nginx
```

---

## Phần 5: Các lệnh thường dùng

```bash
# Xem trạng thái containers
make prod-status

# Xem logs realtime (tất cả)
make prod-logs

# Xem logs service cụ thể
docker compose -f docker/docker-compose.prod.yml logs -f api

# Restart API + Worker
make prod-restart-api

# Restart Frontend
make prod-restart-frontend

# Reload nginx (host)
sudo nginx -t && sudo systemctl reload nginx

# Pull images mới nhất
make prod-pull

# Dừng stack (KHÔNG xóa volumes)
make prod-down

# SSH vào container debug
docker exec -it tactix-api sh
docker exec -it tactix-postgres psql -U tactix -d tactix
```

---

## Phần 6: Xử lý sự cố

### Container không start

```bash
docker logs tactix-api --tail 50
docker logs tactix-postgres --tail 20
```

### Chạy lại migrations thủ công

```bash
cd /opt/tactix
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
GITHUB_OWNER=your-username GITHUB_REPO=tactix IMAGE_TAG=latest \
  bash apps/api/scripts/deploy.sh
```

### Lỗi `zsh:cd: no such file or directory: ***`

`***` là giá trị secret bị GitHub Actions mask trong log, không phải literal path. Lỗi này gần như luôn có nghĩa là `VPS_DEPLOY_PATH` đang sai hoặc repo chưa được clone vào path đó trên VPS.

Kiểm tra nhanh trên VPS:

```bash
ls -la /opt
ls -la /opt/tactix
git -C /opt/tactix status
```

Nếu repo chưa có:

```bash
git clone <YOUR_REPO_URL> /opt/tactix
```

### Rollback về version cụ thể

```bash
cd /opt/tactix
# Thay <sha> bằng 7-char commit SHA
GITHUB_OWNER=your-username GITHUB_REPO=tactix IMAGE_TAG=<sha> \
  bash apps/api/scripts/deploy.sh
```

### Nginx không nhận certificate

```bash
sudo certbot certificates       # kiểm tra cert
sudo nginx -t                   # test config
sudo systemctl reload nginx     # reload
```
