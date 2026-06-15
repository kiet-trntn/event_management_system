const jwt = require("jsonwebtoken"); // Gọi thư viện để xử lý Token (mã xác thực)

const authMiddleware = (req, res, next) => {

    // 1. Lấy chuỗi Token từ Header của yêu cầu gửi lên
    const authHeader = req.headers.authorization;

    // 2. Nếu không tìm thấy Token (chưa gửi lên), báo lỗi và dừng lại luôn
    if (!authHeader) {
        return res.status(401).json({
            message: "Chưa đăng nhập"
        });
    }

    // 3. Cắt bỏ chữ "Bearer " phía trước để lấy chính xác chuỗi mã Token
    const token = authHeader.split(" ")[1];

    try {
        // 4. Kiểm tra xem Token có đúng và còn hạn hay không bằng chìa khóa bí mật (JWT_SECRET)
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 5. Nếu Token đúng, lấy thông tin người dùng được giải mã cất vào 'req.user'
        req.user = decoded;

        // 6. Cho phép vượt qua kiểm tra để đi tiếp vào hàm xử lý chính
        next();

    } catch (error) {
        // 7. Nếu Token sai hoặc hết hạn, báo lỗi và chặn lại
        return res.status(401).json({
            message: "Token không hợp lệ"
        });

    }
};

module.exports = authMiddleware; // Xuất hàm này ra để các file khác sử dụng