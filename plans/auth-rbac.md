# Auth & RBAC — ValueX Login + Phân Quyền

## 1. Mục tiêu & Tổng quan
Hệ thống xác thực (Authentication) và phân quyền dựa trên vai trò (Role-Based Access Control - RBAC) cho nền tảng phân tích cổ phiếu ValueX.

Hệ thống hỗ trợ 3 vai trò:
- **`admin`**: Toàn quyền trên toàn bộ hệ thống, bao gồm trang quản trị người dùng `/admin`.
- **`member_free`**: Chỉ xem được **Bộ lọc (Ranking)** và **Biểu đồ kỹ thuật (Chart)** với các cài đặt mặc định; không cho phép chỉnh sửa bộ lọc hay thêm công cụ vẽ / thay đổi chỉ báo ngoài mặc định. Truy cập các tính năng nâng cao sẽ hiển thị hộp thoại nâng cấp tài khoản VIP (`UpgradePrompt`).
- **`member_vip`**: Xem được tất cả các Tab (bao gồm trang Phân tích Doanh nghiệp AI `/`), cho phép tùy biến mọi bộ lọc và công cụ kỹ thuật.
- **Tự động đăng ký**: Hỗ trợ trang `/register` (Self-service registration) cho phép người dùng mới tạo tài khoản và tự động nhận vai trò `member_free`.
- **Nguyên tắc mở rộng tương lai**: Mọi tính năng mới phát triển BẮT BUỘC phải khai báo định danh `FeatureKey` và ma trận quyền trong [`src/types/auth.ts`](src/types/auth.ts:14) trước khi triển khai.

---

## 2. Ma trận Phân Quyền (Permission Matrix)

| Tính năng / Khu vực | `FeatureKey` | `admin` | `member_vip` | `member_free` | Ghi chú & Hành vi khi bị chặn |
|---|---|---|---|---|---|
| **Bộ lọc & Xếp hạng RS** | `ranking_view` | ✅ | ✅ | ✅ | Được xem danh sách bảng xếp hạng mặc định |
| **Tùy biến Bộ lọc Screener** | `ranking_customize` | ✅ | ✅ | 🔒 | Khóa dropdown tiêu chí Tier 1, hiển thị banner nhắc nhở |
| **Xuất CSV Bảng xếp hạng** | `ranking_export` | ✅ | ✅ | 🔒 | Mở modal nâng cấp `UpgradePrompt` |
| **Biểu đồ Kỹ thuật cơ bản** | `chart_view` | ✅ | ✅ | ✅ | Xem nến OHLC, khối lượng, sự kiện cổ tức mặc định |
| **Công cụ vẽ kỹ thuật** | `chart_drawing` | ✅ | ✅ | 🔒 | Mở modal nâng cấp `UpgradePrompt` |
| **Cài đặt giao diện & Nến** | `chart_settings` | ✅ | ✅ | 🔒 | Mở modal nâng cấp `UpgradePrompt` |
| **Tùy biến chỉ báo kỹ thuật** | `chart_indicators` | ✅ | ✅ | 🔒 | Mở modal nâng cấp `UpgradePrompt` |
| **Phân tích Doanh nghiệp** | `analysis_page` | ✅ | ✅ | 🔒 | Trang chủ `/` bị khóa bằng `RoleGate`, hiển thị banner VIP |
| **Định giá Doanh nghiệp** | `valuation_calculator` | ✅ | ✅ | 🔒 | Chỉ dành cho VIP/Admin |
| **Tải tài liệu PDF/BCTN** | `document_upload` | ✅ | ✅ | 🔒 | Chỉ dành cho VIP/Admin |
| **Xuất Báo cáo PDF** | `export_pdf` | ✅ | ✅ | 🔒 | Chỉ dành cho VIP/Admin |
| **Trang Quản trị Admin** | `admin_dashboard` | ✅ | 🔒 | 🔒 | Middleware chặn và chuyển hướng về `/` |
| **Mọi tính năng mới sau này** | *Cần định nghĩa* | ✅ | Cần phân quyền | 🔒 Mặc định khóa | Bắt buộc khai báo trong ma trận |

---

## 3. Kiến trúc Triển khai (Architecture)

### 3.1. Xác thực & Session (NextAuth v5 + Edge Middleware)
- **`src/lib/auth.config.ts`**: Cấu hình Edge-compatible chứa JWT & Session callbacks (đảm bảo không load thư viện Node như `fs` trong Edge Middleware).
- **`src/lib/auth.ts`**: Cấu hình Credentials Provider với `bcryptjs` so khớp mật khẩu người dùng từ kho lưu trữ.
- **`src/middleware.ts`**: Edge Middleware bảo vệ toàn bộ ứng dụng:
  - Chưa đăng nhập: Redirect đến `/login?callbackUrl=...`
  - Đã đăng nhập: Cho phép vào các route được phân quyền.
  - Route `/admin`: Kiểm tra `token.role === 'admin'`, nếu không chuyển hướng về `/`.
- **`src/components/AuthProvider.tsx`**: SessionProvider cấp quyền client-side cho toàn bộ cây component.

### 3.2. Kho lưu trữ Người dùng (User Store)
- **File**: `data/users.json` (tự động khởi tạo và đồng bộ qua [`src/lib/users-store.ts`](src/lib/users-store.ts:1)).
- Hỗ trợ đầy đủ các hàm:
  - `findUserByEmail(email)`
  - `createUser({ name, email, password, role })` (mặc định role là `member_free`)
  - `getAllUsers()`
  - `updateUserRole(userId, newRole)`

### 3.3. Tài khoản Mẫu Thử nghiệm (Seeded Test Accounts)

| Email | Mật khẩu | Vai trò (`role`) | Mô tả quyền hạn |
|---|---|---|---|
| `admin@valuex.vn` | `admin123` | **admin** | Toàn quyền toàn bộ tính năng + Quản lý User `/admin` |
| `vip@valuex.vn` | `vip123` | **member_vip** | Xem phân tích doanh nghiệp AI, chỉnh sửa bộ lọc, vẽ biểu đồ |
| `free@valuex.vn` | `free123` | **member_free** | Chỉ xem Bộ lọc và Biểu đồ kỹ thuật mặc định |

*Người dùng mới đăng ký qua `/register` sẽ tự động được cấp quyền `member_free` và có thể đăng nhập ngay lập tức.*

---

## 4. Hướng dẫn Lập trình viên: Thêm Tính năng Mới có Phân Quyền

Khi thêm bất kỳ tính năng mới nào trong tương lai, tuân thủ đúng 3 bước bắt buộc sau:

### Bước 1: Khai báo định danh tính năng trong [`src/types/auth.ts`](src/types/auth.ts:14)
```typescript
export type FeatureKey =
    | ...
    | 'my_new_awesome_feature'; // Thêm key mới tại đây

export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
    ...
    // Xác định vai trò nào được phép sử dụng (VD: chỉ Admin và VIP)
    my_new_awesome_feature: ['admin', 'member_vip'],
};
```

### Bước 2: Bảo vệ UI (Cách 1: Khóa toàn bộ component với `RoleGate`)
```tsx
import { RoleGate } from '@/components/RoleGate';

<RoleGate feature="my_new_awesome_feature" featureName="Tính năng Siêu Phân Tích">
    <MyAwesomeFeatureComponent />
</RoleGate>
```

### Bước 3: Bảo vệ UI (Cách 2: Khóa tương tác cụ thể / Mở modal Upgrade)
```tsx
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import { UpgradePrompt } from '@/components/UpgradePrompt';

const { data: session } = useSession();
const userRole = (session?.user?.role as UserRole) || 'member_free';
const [showUpgrade, setShowUpgrade] = useState(false);

const handleAction = () => {
    if (!hasPermission(userRole, 'my_new_awesome_feature')) {
        setShowUpgrade(true);
        return;
    }
    // Thực hiện hành động nếu đủ quyền
};

return (
    <>
        <button onClick={handleAction}>Hành động VIP</button>
        <UpgradePrompt 
            isOpen={showUpgrade} 
            onClose={() => setShowUpgrade(false)} 
            featureName="Tính năng Siêu Phân Tích" 
        />
    </>
);
```

---

## 5. Bảo Mật & Hardening Đã Triển Khai (Security Hardening)

1. **Bảo vệ dữ liệu người dùng (`.gitignore`)**:
   - Thêm `data/users.json` và file tạm `data/users.json.tmp*` vào `.gitignore` để ngăn chặn rò rỉ credential và hash mật khẩu vào Git repository.
2. **Băm mật khẩu bất đồng bộ (Non-blocking Async Bcrypt)**:
   - Toàn bộ hàm băm (`bcrypt.hash`, `bcrypt.genSalt`) và xác thực (`bcrypt.compare`) chuyển sang `async / await`, không gây nghẽn Node.js Event Loop.
   - Hàm `getDefaultUsers()` được thiết kế theo cơ chế Lazy Initialization, loại bỏ hoàn toàn độ trễ khi nạp module lúc khởi động server.
3. **Ghi tệp nguyên tử (Atomic File Writes)**:
   - Triển khai cơ chế Safe Atomic Replacement trong [`src/lib/users-store.ts`](src/lib/users-store.ts:60): Ghi toàn bộ dữ liệu ra tệp tạm `.tmp` trước khi `renameSync` sang file đích, loại bỏ triệt để nguy cơ hỏng định dạng file JSON do lỗi ghi ngắt quãng hoặc race condition từ nhiều request đồng thời.
4. **Tiêu chuẩn phức tạp mật khẩu (Password Strength Validation)**:
   - Triển khai hàm [`validatePasswordStrength()`](src/types/auth.ts:74) áp dụng kiểm tra 2 lớp (Client & Server):
     - Độ dài tối thiểu 8 ký tự
     - Ít nhất 1 chữ cái in hoa (`A-Z`)
     - Ít nhất 1 chữ số (`0-9`)
     - Ít nhất 1 ký tự đặc biệt (`!@#$%...`)

---

## 6. Hướng dẫn Cấu hình Vercel Production (Deployment & Environment Variables)

Để đảm bảo phiên đăng nhập JWT trên môi trường Serverless/Edge của Vercel hoạt động ổn định và bảo mật tối đa:

### 6.1. Cấu hình biến môi trường trên Vercel Dashboard
Truy cập **Vercel Project Dashboard** -> **Settings** -> **Environment Variables**, thêm 2 biến sau cho cả 3 môi trường (**Production**, **Preview**, **Development**):

1. **`AUTH_SECRET`**:
   - Giá trị: Chuỗi ngẫu nhiên 32+ bytes (Ví dụ: `b7e28b8cf9286eb91ef64c5750d53457a4190c13e648834d0b00115e58aa35a4` hoặc sinh qua `openssl rand -base64 33` / `npx auth secret`).
   - *Tác dụng*: Khóa bí mật mã hóa và xác thực token JWT phiên đăng nhập, ngăn ngừa giả mạo session.

2. **`AUTH_TRUST_HOST`**:
   - Giá trị: `true`
   - *Tác dụng*: Cho phép NextAuth tin tưởng domain động của Vercel (bao gồm domain tùy chỉnh và các URL preview `*.vercel.app`), tránh lỗi `UntrustedHost`.

### 6.2. Cấu hình nhanh bằng Vercel CLI (Tùy chọn)
Nếu đã đăng nhập Vercel CLI:
```bash
# Thêm AUTH_SECRET
vercel env add AUTH_SECRET production preview development

# Thêm AUTH_TRUST_HOST
vercel env add AUTH_TRUST_HOST production preview development
```
*Lưu ý: Sau khi thêm hoặc cập nhật biến môi trường, hãy tiến hành **Redeploy** lại bản build gần nhất trên Vercel để áp dụng thay đổi.*

