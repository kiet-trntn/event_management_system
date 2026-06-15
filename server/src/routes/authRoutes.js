const express = require("express"); // Gọi thư viện Express để dùng các tính năng web
const router = express.Router(); // Tạo một đối tượng Router để định nghĩa các đường dẫn (API)

// Import các "người gác cổng" (Middleware)
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware kiểm tra đã đăng nhập chưa
const roleMiddleware = require("../middlewares/roleMiddleware"); // Middleware kiểm tra quyền (Admin/User)

// Import các hàm xử lý logic (Controller) từ file authController
const {
    register,
    login,
    changePassword
} = require("../controllers/authController");

// 1. Đường dẫn đăng ký tài khoản (Không cần đăng nhập)
router.post("/register", register);

// 2. Đường dẫn đăng nhập (Không cần đăng nhập)
router.post("/login", login);

// 3. Đường dẫn đổi mật khẩu (Bắt buộc phải đăng nhập trước)
router.put(
    "/change-password",
    authMiddleware, // Kiểm tra đăng nhập, hợp lệ mới cho đi tiếp
    changePassword  // Hàm xử lý đổi mật khẩu chính
);

// 4. Đường dẫn chỉ dành riêng cho Admin
router.get(
    "/admin-only",
    authMiddleware,           // Bước 1: Kiểm tra xem đã đăng nhập chưa
    roleMiddleware("admin"),  // Bước 2: Kiểm tra xem có phải là "admin" không
    (req, res) => {           // Bước 3: Nếu vượt qua 2 bước trên thì phản hồi lời chào
        res.json({
            message: "Xin chào Admin"
        });
    }
);

module.exports = router; // Xuất router này ra để file server chính (thường là app.js hoặc server.js) sử dụng