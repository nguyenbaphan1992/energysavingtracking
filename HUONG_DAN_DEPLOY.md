# Hướng dẫn Deploy Webapp Tiết Kiệm Năng Lượng

## Thông tin Supabase đã tạo

- **Project:** energy-saving-monitoring
- **URL:** https://hotakbhmppbsxkbzprqa.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/hotakbhmppbsxkbzprqa

---

## BƯỚC 1: Tạo tài khoản Admin trong Supabase

1. Vào: https://supabase.com/dashboard/project/hotakbhmppbsxkbzprqa
2. Chọn **Authentication** → **Users** (bên trái)
3. Nhấn nút **"Add user"** → **"Create new user"**
4. Nhập:
   - **Email:** `admin@tinhloi.com` (hoặc email anh muốn)
   - **Password:** đặt mật khẩu mạnh
   - ✅ Tick **"Auto Confirm User"**
5. Nhấn **"Create User"**

> ⚠️ Ghi nhớ email và mật khẩu này — dùng để đăng nhập Admin trên webapp.

---

## BƯỚC 2: Đẩy code lên GitHub

### Lần đầu (chưa có repo):

```bash
# Mở Terminal, vào thư mục dự án
cd "/Users/nguyenbaphan/Documents/Claude/Projects/RG saving energy/energy-saving-monitoring"

# Khởi tạo git
git init
git add .
git commit -m "Initial commit: Energy Saving Monitoring webapp"

# Tạo repo mới trên GitHub.com (github.com → New repository)
# Tên repo gợi ý: energy-saving-monitoring
# Để chế độ: Private

# Sau khi tạo xong, chạy lệnh này (thay YOUR_USERNAME):
git remote add origin https://github.com/YOUR_USERNAME/energy-saving-monitoring.git
git branch -M main
git push -u origin main
```

---

## BƯỚC 3: Deploy lên Vercel

1. Vào **https://vercel.com** → Đăng nhập
2. Nhấn **"Add New Project"**
3. Chọn **Import Git Repository** → chọn repo `energy-saving-monitoring`
4. Vercel tự nhận đây là Vite project

### Cài đặt Environment Variables (BẮT BUỘC):

Trong trang cài đặt Vercel, tìm mục **"Environment Variables"** và thêm:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://hotakbhmppbsxkbzprqa.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGFrYmhtcHBic3hrYnpwcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTQ0NTIsImV4cCI6MjA5NzE5MDQ1Mn0.dLKw0Cf6VD_QvPWCIOxO0d6m3oXQtT3JLvOWZ741Le8` |

5. Nhấn **"Deploy"** → chờ ~1 phút

### Đặt domain tùy chỉnh:

Sau khi deploy xong:
1. Vào **Settings** → **Domains**
2. Thêm domain: `energysavingmonitoring.vercel.app`
   (hoặc Vercel sẽ tự tạo domain dạng `energy-saving-monitoring-xxx.vercel.app`)

---

## BƯỚC 4: Kiểm tra sau deploy

- [ ] Truy cập URL → thấy Dashboard
- [ ] Nhấn tab **Sweater** và **Lifestyle** → thấy bảng xếp hạng
- [ ] Vào `/login` → đăng nhập với email/password đã tạo ở Bước 1
- [ ] Sau login → vào **Nhập liệu** → nhập thử số liệu
- [ ] Vào **Baseline** → kiểm tra số baseline đã được pre-load
- [ ] Vào **Slideshow** → thêm thử 1 ảnh

---

## Quy trình làm việc hàng tuần

1. **Mỗi thứ 2 hàng tuần** (sau khi có số liệu tuần trước):
   - Đăng nhập Admin → **Nhập liệu**
   - Chọn nhóm **Sweater**, chọn tuần → nhập Điện + SAH/Pcs cho từng block → **Lưu**
   - Chọn nhóm **Lifestyle** → làm tương tự

2. **Đầu mỗi tháng** (khoảng ngày 1-3):
   - Admin → **Cài đặt Baseline**
   - Nhập trung bình Điện và SAH/Pcs của 2 tháng vừa qua
   - Đặt ngày "Áp dụng từ" là ngày 1 của tháng mới → **Cập nhật**

3. **Khi phát hiện vi phạm:**
   - Admin → **Tạo vi phạm** → điền thông tin → upload link ảnh → Lưu

4. **Upload ảnh findings lên Slideshow:**
   - Admin → **Slideshow** → dán link ảnh (Google Drive link trực tiếp, Imgur, v.v.)

---

## Lưu ý link ảnh cho Slideshow và Vi phạm

Webapp dùng URL ảnh trực tiếp. Cách lấy link ảnh trực tiếp:

- **Google Drive:** Tải ảnh lên Drive → Share → "Anyone with link can view" → dùng link dạng:
  `https://drive.google.com/uc?id=FILE_ID`
- **Imgur:** Upload ảnh lên imgur.com → dùng link `.jpg` trực tiếp
- **Bất kỳ hosting nào** miễn là link kết thúc bằng `.jpg`, `.png`, `.webp`

---

## Cập nhật code sau này

Mỗi khi sửa code:
```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```
Vercel tự động deploy lại sau khi push.
