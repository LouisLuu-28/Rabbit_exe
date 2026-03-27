# Rabbit EMS - Test nhanh phân gói (5-10 phút)

Tài liệu này giúp kiểm tra nhanh tính năng phân quyền theo gói sau khi pull code mới.

## 1) Chuẩn bị

- Cài dependencies:

```bash
npm install
```

- Chạy local:

```bash
npm run dev
```

- Mở app tại URL Vite hiển thị trong terminal.

## 2) Đăng nhập và vào trang gói

1. Đăng nhập tài khoản test.
2. Vào menu **Tài Khoản**.
3. Tại block **Gói Sử Dụng**, chọn gói và bấm **Lưu gói**.
4. Bấm **Tạo dữ liệu demo theo gói hiện tại** để có dữ liệu test tự động.

> Lưu ý: Gói được lưu vào `auth.user_metadata.plan`.

## 3) Checklist theo từng gói

### A. Unpaid

- Chọn `Unpaid` và lưu.
- Kỳ vọng:
  - Sidebar KHÔNG hiển thị: Dashboard, Đơn Hàng, Thực Đơn Tuần, Kho Nguyên Liệu, Tài Chính.
  - Chỉ còn trang Tài Khoản.
  - Truy cập trực tiếp URL nội bộ (vd `/orders`, `/dashboard`) bị chặn bằng màn hình **Bạn chưa có quyền truy cập**.
  - Nút tạo demo sẽ không tạo dữ liệu nghiệp vụ (0 bản ghi).

### B. Basic

- Chọn `Basic` và lưu.
- Kỳ vọng:
  - Sidebar hiển thị: Đơn Hàng, Thực Đơn Tuần, Kho Nguyên Liệu.
  - Sidebar KHÔNG hiển thị: Dashboard, Tài Chính.
  - Ở trang Menu/Kho: nút **Nhập Excel** bị disable.

### C. Standard

- Chọn `Standard` và lưu.
- Kỳ vọng:
  - Sidebar hiển thị: Dashboard, Đơn Hàng, Thực Đơn Tuần, Kho Nguyên Liệu, Tài Chính.
  - Ở trang Menu/Kho: nút **Nhập Excel** bị disable.

### D. Premium

- Chọn `Premium` và lưu.
- Kỳ vọng:
  - Sidebar hiển thị đầy đủ module nghiệp vụ.
  - Ở trang Menu/Kho: nút **Nhập Excel** enabled và mở dialog bình thường.

## 4) Test chặn route trực tiếp

Khi ở từng gói, nhập tay các URL sau:

- `/dashboard`
- `/orders`
- `/menu-planning`
- `/inventory`
- `/financial`

Kỳ vọng: URL nào không thuộc quyền gói thì hiển thị màn **Bạn chưa có quyền truy cập**.

## 5) Test ổn định sau refresh

- Sau khi lưu gói, F5 lại trang.
- Kỳ vọng: quyền vẫn giữ đúng theo gói đã lưu.

## 6) Build smoke test

```bash
npm run build
```

Kỳ vọng: build thành công.

## 7) Phạm vi hiện tại

- AI chat giữ nguyên như cũ (không nằm trong phạm vi phân gói ở bản này).
- Phân gói áp dụng cho module nghiệp vụ + quyền dùng Excel import.
