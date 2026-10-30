# TEAM DUTY – bản khởi đầu

## Chức năng demo
- Sinh viên chọn hồ sơ mẫu, chọn tháng và tick các ca Sáng / Chiều / Tối.
- Dữ liệu tự lưu trong localStorage của trình duyệt.
- Thầy cô xem sinh viên rảnh theo từng ngày và ca.
- Hệ thống đề xuất phân công, ưu tiên sinh viên có ít ca đã được phân công.
- Thầy cô có thể thêm/bỏ sinh viên khỏi ca, sau đó công bố lịch.
- Sinh viên xem lịch trực chính thức.
- Xuất dữ liệu CSV.

## Chạy thử
Cần cài Node.js LTS:
```bash
npm install
npm run dev
```
Mở địa chỉ Vite hiển thị, thường là http://localhost:5173.

## Lưu ý trước khi dùng thật
Đây là prototype một trình duyệt. Dữ liệu không tự đồng bộ giữa máy sinh viên và máy thầy cô. Để triển khai cho cả đội, cần tạo Supabase, bật Auth, chạy `supabase/schema.sql`, bổ sung Row Level Security đầy đủ và kết nối frontend với Supabase. Chỉ giáo viên được phép phân công/công bố; sinh viên chỉ được sửa đăng ký của chính mình. Không đưa service_role key vào frontend.
