const db = require("../config/db"); // Gọi file kết nối db
const bcrypt = require("bcrypt"); // Gọi thư viện mã hóa mật khẩu

const getAllUsers = async (req, res) => {
    try {
        // Thực hiện câu lệnh SQL để lấy các thông tin cần thiết của toàn bộ người dùng từ bảng 'users'
        // Không lấy cột 'password' để đảm bảo an toàn bảo mật
        const [users] = await db.query('SELECT id, full_name, email, role, created_at FROM users ORDER BY id DESC');

        // Trả về danh sách người dùng dưới dạng JSON
        res.json(users);
    } catch (error) {
        // In lỗi ra màn hình Terminal của Server để dễ dàng theo dõi và xử lý
        console.log(error);

        // Nếu lỗi hệ thống trả về 500 kèm nội dung lỗi
        res.status(500).json({
            message: error.message || "Đã xảy ra lỗi khi lấy danh sách người dùng"
        });
    }
}

const getUserById = async (req, res) => {
    try {
        const { id } = req.params; // Lấy id người dùng từ tham số đường dẫn
        const [users] = await db.query('SELECT id, full_name, email, role, created_at FROM users WHERE id = ?', [id]); // Truy vấn người dùng theo id

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thành viên"
            });
        }

        res.json(users[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: error.message || "Đã xảy ra lỗi khi lấy thông tin người dùng"
        });
    }
}

const createUser = async (req, res) => {
    try {

        // Lấy thông tin thành viên mới từ nội dung (body) mà Client gửi lên
        const {
            full_name, email, password, role
        } = req.body;

        // Kiểm tra dữ liệu: Bắt buộc nhập đầy đủ tên, email, password
        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        // Kiểm tra độ dài tên: Yêu cầu tên phải từ 3 ký tự trở lên
        if (full_name.length < 3) {
            return res.status(400).json({
                message: "Họ tên phải từ 3 ký tự trở lên"
            });
        }

        // Chỉ cho phép role hợp lệ (admin hoặc employee), nếu role được cung cấp và không hợp lệ thì trả về lỗi
        if (
            role &&
            role !== "admin" &&
            role !== "employee"
        ) {
            return res.status(400).json({
                message: "Role không hợp lệ"
            });
        }


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Kiểm tra định dạng email: Sử dụng biểu thức chính quy (Regex) để kiểm tra xem email có hợp lệ hay không
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        // Kiểm tra email: Tìm xem email đã tồn tại trong database chưa
        const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

        // Nếu tìm thấy kết quả (độ dài mảng > 0), nghĩa là email đã tồn tại
        if (user.length > 0) {
            return res.status(400).json({
                message: "Email đã tồn tại"
            });
        }

        // Mã hóa mật khẩu: Sử dụng bcrypt để mã hóa mật khẩu trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(password, 10); // 10 là số lần băm (salt rounds)

        // Lưu thông tin thành viên mới vào database
        await db.query("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", [full_name, email, hashedPassword, role]); // role mặc định sẽ là employee nếu không được cung cấp

        // Trả về thông báo thành công (Status 201 - Đã tạo mới thành công)
        res.status(201).json({
            message: "Thành viên mới đã được tạo thành công"
        });
    } catch (error) {
        console.log(error); // In lỗi ra màn hình Terminal của Server

        // Trả về mã lỗi 500 (Lỗi máy chủ) và thông báo lỗi
        res.status(500).json({
            message: error.message || "Đã xảy ra lỗi khi tạo thành viên mới"
        });
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser
}