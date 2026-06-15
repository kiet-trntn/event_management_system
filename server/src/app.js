const express = require("express"); // Khởi tạo thư viện Express để làm server
const cors = require("cors"); // Cho phép các ứng dụng khác (React, Vue,...) gọi được API này

const authRoutes = require("./routes/authRoutes"); // Lấy danh sách các đường dẫn đăng ký/đăng nhập vào
const userRoutes = require("./routes/userRoutes"); // Lấy danh sách các đường dẫn liên quan đến thành viên (tạo mới, xem danh sách,...)

const app = express(); // Tạo ra một ứng dụng server

app.use(cors()); // Bật chức năng cho phép gọi API khác tên miền (CORS)
app.use(express.json()); // Giúp server đọc được dữ liệu dạng JSON gửi lên từ Client


app.use("/api/auth", authRoutes); // Gắn tiền tố "/api/auth" cho các đường dẫn trong authRoutes (Ví dụ: /api/auth/login)
app.use("/api/users", userRoutes); // Gắn tiền tố "/api/users" cho các đường dẫn trong userRoutes (Ví dụ: /api/users/create)

// Đường dẫn kiểm tra xem server có đang hoạt động hay không
app.get("/", (req, res) => {
    res.json({
        message: "Event Management API Running" // Trả về thông báo server đang chạy
    });
});

module.exports = app; // Xuất server này ra để file index.js hoặc server.js kích hoạt chạy cổng (Port)