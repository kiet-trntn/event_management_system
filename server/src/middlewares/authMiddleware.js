const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                message: "Chưa đăng nhập"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Token không hợp lệ"
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    message:
                        "Phiên đăng nhập đã hết hạn"
                });
            }

            return res.status(401).json({
                message: "Token không hợp lệ"
            });
        }

        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                email,
                role,
                status
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Người dùng không tồn tại"
            });
        }

        const user = users[0];

        if (user.status !== "active") {
            return res.status(403).json({
                message:
                    "Tài khoản đã bị khóa hoặc ngừng hoạt động"
            });
        }

        req.user = {
            id: Number(user.id),
            full_name: user.full_name,
            email: user.email,
            role: user.role
        };

        next();

    } catch (error) {
        console.error(
            "Lỗi authMiddleware:",
            error
        );

        return res.status(500).json({
            message: "Lỗi xác thực người dùng"
        });
    }
};

module.exports = authMiddleware;