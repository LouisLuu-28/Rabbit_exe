# Checklist triển khai phân quyền theo gói

## 1) Trạng thái đã hoàn thiện trong code

- Phân quyền feature theo gói: [src/lib/subscription.ts](src/lib/subscription.ts)
- Lấy gói user từ `auth.user_metadata.plan`: [src/hooks/use-subscription.ts](src/hooks/use-subscription.ts)
- Chặn route theo feature: [src/App.tsx](src/App.tsx)
- Ẩn menu theo quyền: [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx)
- Trang quản lý gói user: [src/pages/Account.tsx](src/pages/Account.tsx)
- AI chat giữ nguyên như ban đầu (không nằm trong phạm vi phân gói backend)
- Đăng ký user mới có sẵn plan mặc định `unpaid`: [src/pages/Auth.tsx](src/pages/Auth.tsx)

## 2) Migration DB

Hiện tại **không bắt buộc** chạy migration để phân gói hoạt động.
File migration plan vẫn giữ lại để dùng khi muốn đồng bộ sang `profiles.plan` trong tương lai:

- [supabase/migrations/20260325000000_add_profiles_plan.sql](supabase/migrations/20260325000000_add_profiles_plan.sql)

Nếu vẫn muốn chạy migration qua CLI:

### 2.1 Chuẩn bị token Supabase CLI

Trong PowerShell:

```powershell
$env:SUPABASE_ACCESS_TOKEN="<your_supabase_access_token>"
```

### 2.2 Link project và push migration

```powershell
npm run sb:link
npm run sb:push
```

> Project ref đang dùng: `ufjoxvdrtugmogbymkav`

## 3) Cấu hình env cơ bản

Tạo file `.env` từ [.env.example](.env.example) và điền:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`

## 4) Test nhanh theo từng gói

Vào [src/pages/Account.tsx](src/pages/Account.tsx) đổi gói user và kiểm tra:

### Unpaid
- Không thấy các menu nội bộ (`dashboard/orders/menu/inventory/financial`)
- Truy cập trực tiếp URL nội bộ sẽ bị chặn

### Basic
- Có `orders/menu/inventory`
- Không có `dashboard/financial`
- Không có Excel import

### Standard
- Có `dashboard/orders/menu/inventory/financial`
- Không có Excel import

### Premium
- Có tất cả module
- Có nút import Excel ở menu/inventory

> Lưu ý: AI assistant không bị phân quyền theo gói ở phiên bản hiện tại.

## 5) Lệnh kiểm tra

```powershell
npm run build
npm run dev
```

## 6) Lưu ý

- `npm run lint` hiện có lỗi cũ ở nhiều file không thuộc thay đổi phân quyền. Không ảnh hưởng việc build/chạy tính năng gói.
