require("dotenv").config(); // Nạp các biến môi trường từ file .env vào hệ thống (ví dụ: PORT, mã bí mật JWT)

const app = require("./src/app"); // Gọi cấu hình server đã làm từ file app.js sang

const PORT = process.env.PORT || 5000; // Chọn cổng chạy server: Ưu tiên cổng trong file .env, nếu không có thì dùng cổng 5000

// Ra lệnh cho server chính thức mở cửa và lắng nghe các yêu cầu từ Client gửi tới cổng đã chọn
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // In ra màn hình thông báo server đã chạy thành công
});