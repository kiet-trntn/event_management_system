const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authMiddleware = async (req, res, next) => {

    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    } 
    else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            message: "Chưa đăng nhập"
        });
    }

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