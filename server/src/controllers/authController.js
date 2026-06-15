// Import các thư viện cần thiết
const db = require("../config/db"); // Import cấu hình kết nối database (thường là MySQL/PostgreSQL)
const bcrypt = require("bcrypt"); // Import thư viện mã hóa và kiểm tra mật khẩu
const jwt = require("jsonwebtoken"); // Import thư viện tạo và xác thực JSON Web Token


 //CHỨC NĂNG ĐĂNG KÝ (REGISTER)
const register = async (req, res) => {
    try {
        // Lấy dữ liệu người dùng nhập vào từ body của request
        const { full_name, email, password } = req.body;

        // Mã hóa mật khẩu bằng bcrypt với salt round là 10 để bảo mật
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thực hiện câu lệnh SQL để chèn user mới vào bảng 'users'
        await db.query(
            `INSERT INTO users(full_name,email,password)
             VALUES(?,?,?)`,
            [full_name, email, hashedPassword] // Dùng dấu hỏi chấm (?) để tránh lỗi SQL Injection
        );

        // Trả về response thành công (Status 201: Created) kèm thông báo
        res.status(201).json({
            message: "Đăng ký thành công"
        });

    } catch (error) {
        // Nếu có lỗi xảy ra (ví dụ: trùng email), trả về lỗi hệ thống (Status 500)
        res.status(500).json(error);
    }
};


 //CHỨC NĂNG ĐĂNG NHẬP (LOGIN)
const login = async (req, res) => {
    try {
        // Lấy thông tin đăng nhập từ body của request
        const { email, password } = req.body;

        // 1. Kiểm tra rỗng: Nếu thiếu email hoặc password thì dừng lại và báo lỗi
        if (!email || !password) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ email và mật khẩu"
            });
        }

        // 2. Kiểm tra định dạng email bằng biểu thức chính quy (Regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        // 3. Kiểm tra email trong database: Tìm xem có user nào trùng email không
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        // Nếu mảng kết quả trống, tức là email chưa được đăng ký trong hệ thống
        if (users.length === 0) {
            return res.status(404).json({
                message: "Email không tồn tại"
            });
        }

        // 4. Kiểm tra mật khẩu
        const user = users[0]; // Lấy ra phần tử user đầu tiên tìm thấy

        // So sánh mật khẩu text thô (người dùng nhập) với mật khẩu đã mã hóa (trong db)
        const match = await bcrypt.compare(
            password,
            user.password
        );

        // Nếu mật khẩu không khớp, trả về lỗi 401 (Unauthorized)
        if (!match) {
            return res.status(401).json({
                message: "Sai mật khẩu"
            });
        }

        // Kiểm tra xem tài khoản có đang bị khóa hay không
        if (user.status === "inactive") {
            return res.status(403).json({
                message: "Tài khoản đã bị khóa"
            });
        }

        // 5. Tạo token xác thực (JWT)
        const token = jwt.sign(
            {
                id: user.id,     // Lưu ID người dùng vào token payload
                role: user.role   // Lưu quyền của người dùng (ví dụ: admin, user)
            },
            process.env.JWT_SECRET, // Mã bí mật để mã hóa token (lấy từ file .env)
            {
                expiresIn: "7d" // Token này sẽ hết hạn sau 7 ngày
            }
        );

        // Trả về dữ liệu đăng nhập thành công bao gồm chuỗi token và thông tin user
        res.json({
            token,
            user
        });

    } catch (error) {
        // Bắt các lỗi phát sinh khác trong quá trình xử lý và trả về lỗi 500
        res.status(500).json(error);
    }
};


 //CHỨC NĂNG ĐỔI MẬT KHẨU (CHANGE PASSWORD)

const changePassword = async (req, res) => {
    try {
        // Lấy ID người dùng hiện tại (ID này thường do Middleware xác thực JWT đính kèm vào req.user)
        const userId = req.user.id;

        // Lấy mật khẩu cũ, mật khẩu mới và xác nhận mật khẩu từ body của request
        const {
            oldPassword,
            newPassword,
            confirmPassword
        } = req.body;

        // Kiểm tra rỗng: Đảm bảo người dùng nhập đủ cả 3 trường thông tin
        if (
            !oldPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        // Kiểm tra xác nhận mật khẩu: Mật khẩu mới và nhập lại mật khẩu mới phải trùng nhau
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Xác nhận mật khẩu không khớp"
            });
        }

        // Lấy thông tin user hiện tại từ database dựa trên userId
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [userId]
        );

        const user = users[0];

        // Kiểm tra mật khẩu cũ: Đối chiếu mật khẩu cũ người dùng nhập với mật khẩu hiện tại trong db
        const isMatch = await bcrypt.compare(
            oldPassword,
            user.password
        );

        // Nếu mật khẩu cũ không chính xác thì dừng và báo lỗi
        if (!isMatch) {
            return res.status(400).json({
                message: "Mật khẩu cũ không đúng"
            });
        }

        // Mã hóa mật khẩu mới trước khi lưu vào cơ sở dữ liệu để bảo mật
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Thực hiện cập nhật mật khẩu mới vào cơ sở dữ liệu
        await db.query(
            `
            UPDATE users
            SET password = ?
            WHERE id = ?
            `,
            [hashedPassword, userId]
        );

        // Trả về thông báo đổi mật khẩu thành công
        res.json({
            message: "Đổi mật khẩu thành công"
        });

    } catch (error) {
        // Trả về lỗi hệ thống nếu xảy ra sự cố (ví dụ mất kết nối database)
        res.status(500).json(error);
    }
};

// Xuất các hàm (controller) ra ngoài để các file định tuyến (routes) có thể gọi sử dụng
module.exports = {
    register,
    login,
    changePassword
};