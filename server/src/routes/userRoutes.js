const express = require("express"); // Gọi thư viện Express để dùng các tính năng web
const router = express.Router(); // Tạo một đối tượng Router để định nghĩa các đường dẫn (API)

const { 
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser,
    updateStatus,
    deleteUser 
} = require("../controllers/userController"); // Import hàm createUser từ userController

//  Gọi các "người gác cổng" (Middleware) để bảo mật đường dẫn
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware kiểm tra đã đăng nhập chưa
const roleMiddleware = require("../middlewares/roleMiddleware"); // Middleware kiểm tra quyền (Admin/User)

// XEM: Đường dẫn lấy danh sách tất cả người dùng (Chỉ Admin mới được phép xem danh sách người dùng)
router.get(
    "/", 
    authMiddleware, 
    roleMiddleware("admin"), 
    getAllUsers
); 

// XEM CHI TIẾT: Đường dẫn lấy thông tin chi tiết của một người dùng theo ID (Chỉ Admin mới được phép xem thông tin chi tiết người dùng)
router.get(
    "/:id", 
    authMiddleware, 
    roleMiddleware("admin"), 
    getUserById
); 

// TẠO: Đường dẫn tạo thành viên mới (Chỉ Admin mới được phép tạo thành viên mới)
router.post(
    "/",              // Đường dẫn API: /api/users/create
    authMiddleware,         // Bước 1: Kiểm tra xem đã đăng nhập chưa
    roleMiddleware("admin"),// Bước 2: Kiểm tra xem có phải là "admin" không
    createUser              // Bước 3: Nếu vượt qua 2 bước trên thì gọi hàm createUser để xử lý logic tạo thành viên mới
);

// CẬP NHẬT: Đường dẫn cập nhật thông tin người dùng (Chỉ Admin mới được phép cập nhật thông tin người dùng)
router.put(
    "/:id",             // Đường dẫn API: /api/users/:id
    authMiddleware,         // Bước 1: Kiểm tra xem đã đăng nhập chưa
    roleMiddleware("admin"),// Bước 2: Kiểm tra xem có phải là "admin" không
    updateUser              // Bước 3: Nếu vượt qua 2 bước trên thì gọi hàm updateUser để xử lý logic cập nhật thông tin người dùng
);

// CẬP NHẬT TRẠNG THÁI: Đường dẫn cập nhật trạng thái người dùng (Chỉ Admin mới được phép cập nhật trạng thái người dùng)
router.put(
    "/:id/status",
    authMiddleware,
    roleMiddleware("admin"),
    updateStatus
);

// XÓA: Đường dẫn xóa người dùng (Chỉ Admin mới được phép xóa người dùng)
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    deleteUser
);

module.exports = router; // Xuất router này ra để file server chính (thường là app.js hoặc server.js) sử dụng