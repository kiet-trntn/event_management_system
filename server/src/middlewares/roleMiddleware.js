// Khởi tạo hàm phân quyền, dấu (...roles) nghĩa là bạn có thể truyền vào nhiều quyền cùng lúc (Ví dụ: "admin", "manager")
const roleMiddleware = (...roles) => {

    // Trả về một hàm Middleware chuẩn của Express có 3 tham số (req, res, next)
    return (req, res, next) => {

        // Kiểm tra xem quyền của người dùng hiện tại (req.user.role) có nằm trong danh sách quyền được phép truy cập (roles) hay không
        if (!roles.includes(req.user.role)) {

            // Nếu KHÔNG nằm trong danh sách (tức là sai quyền), chặn lại và trả về lỗi 403 (Cấm truy cập)
            return res.status(403).json({
                message: "Bạn không có quyền truy cập"
            });

        }

        // Nếu hợp lệ (đúng quyền), cho phép vượt qua để đi tiếp vào hàm xử lý chính
        next();

    };

};

module.exports = roleMiddleware; // Xuất hàm này ra để các file khác sử dụng