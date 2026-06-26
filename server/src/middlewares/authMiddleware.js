const jwt = require("jsonwebtoken");

const db = require("../config/db");

const authMiddleware = async (req, res, next) => {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Chưa đăng nhập"
        });
    }

    const token =
        authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Lấy thông tin User mới nhất
        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                email,
                role
            FROM users
            WHERE id = ?
            `,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Người dùng không tồn tại"
            });
        }

        req.user = users[0];

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Token không hợp lệ"
        });

    }

};

module.exports = authMiddleware;