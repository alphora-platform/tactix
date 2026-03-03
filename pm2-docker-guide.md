# Hướng dẫn Quản lý Log với PM2 trong Docker

Trong môi trường product, Tactix Backend được triển khai bằng Docker và sử dụng **PM2** để khởi chạy các module dưới dạng các Micro-processes riêng biệt (`tactix-api` và `tactix-worker`).

Điều này cho phép chúng ta giám sát Memory, CPU và xem Log realtime cho từng service một cách cực kì tiện lợi.

---

## 🚀 1. Truy cập vào Container

Để sử dụng PM2 CLI, bạn cần chui vào bên trong `backend` container của Tactix.

```bash
# Lấy danh sách các container đang chạy
docker ps

# Truy cập vào shell của container backend (ví dụ tên là tactix-backend-1)
docker exec -it tactix-backend-1 /bin/sh
```

---

## 📊 2. Lệnh giám sát PM2 thông dụng

Khi đã ở trong container, bạn có thể dùng các lệnh dưới đây để tương tác với PM2:

### Xem bảng điều khiển (Dashboard) cực xịn

Đây là lệnh mạnh mẽ nhất để xem trực quan tài nguyên (Memory, CPU) và Log trực tiếp cùng lúc.

```bash
# Mở bảng điều khiển realtime
pm2 monit
```

_(Ấn phím mũi tên Lên/Xuống để chuyển qua lại giữa các service. Nhấn `q` hoặc `Ctrl+C` để thoát)_

### Xem danh sách các Service đang chạy

```bash
pm2 ls
# hoặc
pm2 list
```

### Xem Log Realtime (Giống `tail -f`)

Nếu bạn chỉ muốn xem log mà không cần giao diện dashboard:

```bash
# Xem log của TẤT CẢ các process gộp lại (Có tự động phân loại bằng màu sắc)
pm2 logs

# Chỉ xem log của riêng API server (bỏ qua cronjob/worker log)
pm2 logs tactix-api

# Chỉ xem log của riêng Worker (Background jobs, crawl dữ liệu...)
pm2 logs tactix-worker

# Xem 100 dòng log gần nhất của tất cả
pm2 logs --lines 100
```

### Dọn dẹp Log (Khi file log quá lớn)

Nếu chạy lâu ngày các file log của PM2 có thể phình to, bạn có thể làm sạch chúng:

```bash
# Xóa trắng (truncate) toàn bộ dữ liệu log cũ
pm2 flush
```

---

## 🔄 3. Khởi động lại (Restart) Service nhanh

Bạn không cần phải restart lại cả cái Docker container nếu lỡ có 1 tiến trình bị kẹt. Bạn có thể restart ngay trong PM2:

```bash
# Chỉ khởi động lại tiến trình Background Worker
pm2 restart tactix-worker

# Chỉ khởi động lại HTTP API
pm2 restart tactix-api

# Khởi động lại tất cả
pm2 restart all
```

---

## 📁 4. Vị trí File Log vật lý

Nếu bạn muốn copy log thô mang ra ngoài phân tích, các file text thông thường sẽ được PM2 lưu mặc định tại cấu trúc sau bên trong thư mục `~/.pm2/logs/`:

- `~/.pm2/logs/tactix-api-out.log` (Log chuẩn)
- `~/.pm2/logs/tactix-api-error.log` (Lỗi)
- `~/.pm2/logs/tactix-worker-out.log` (Log chuẩn của worker)
- `~/.pm2/logs/tactix-worker-error.log` (Lỗi của worker)
