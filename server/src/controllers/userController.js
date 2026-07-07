const db = require("../config/db"); // Gọi file kết nối db
const bcrypt = require("bcrypt"); // Gọi thư viện mã hóa mật khẩu
const handleServerError = require("../utils/handleServerError");

const getAllUsers = async (req, res) => {

    try {

        const {
            search,
            role,
            status
        } = req.query;

        let sql = `
            SELECT
                id,
                full_name,
                email,
                phone,
                gender,
                date_of_birth,
                address,
                bio,
                role,
                status,
                created_at,
                updated_at
            FROM users
            WHERE 1 = 1
        `;

        const params = [];

        if (search) {
            sql += `
                AND (
                    full_name LIKE ?
                    OR email LIKE ?
                    OR phone LIKE ?
                    OR address LIKE ?
                )
            `;

            params.push(
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`
            );
        }

        if (role) {
            sql += ` AND role = ?`;
            params.push(role);
        }

        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY created_at DESC`;

        const [users] = await db.query(sql, params);

        res.json({
            total: users.length,
            users
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getUserById = async (req, res) => {

    try {

        const { id } = req.params;

        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone,
                gender,
                date_of_birth,
                address,
                bio,
                role,
                status,
                created_at,
                updated_at
            FROM users
            WHERE id = ?
            `,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        res.json({
            user: users[0]
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const createUser = async (req, res) => {

    try {

        let {
            full_name,
            email,
            password,
            role,
            phone,
            gender,
            date_of_birth,
            address,
            bio
        } = req.body;

        full_name = full_name?.trim();
        email = email?.trim().toLowerCase();
        phone = phone?.trim() || null;
        address = address?.trim() || null;
        bio = bio?.trim() || null;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        if (full_name.length < 3) {
            return res.status(400).json({
                message: "Họ tên phải từ 3 ký tự trở lên"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Mật khẩu phải từ 6 ký tự trở lên"
            });
        }

        if (
            role &&
            role !== "admin" &&
            role !== "employee"
        ) {
            return res.status(400).json({
                message: "Role không hợp lệ"
            });
        }

        if (
            gender &&
            gender !== "male" &&
            gender !== "female" &&
            gender !== "other"
        ) {
            return res.status(400).json({
                message: "Giới tính không hợp lệ"
            });
        }

        const [users] = await db.query(
            `
            SELECT id
            FROM users
            WHERE email = ?
            `,
            [email]
        );

        if (users.length > 0) {
            return res.status(400).json({
                message: "Email đã tồn tại"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `
            INSERT INTO users
            (
                full_name,
                email,
                password,
                phone,
                gender,
                date_of_birth,
                address,
                bio,
                role,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                full_name,
                email,
                hashedPassword,
                phone,
                gender || null,
                date_of_birth || null,
                address,
                bio,
                role || "employee",
                "active"
            ]
        );

        res.status(201).json({
            message: "Thành viên mới đã được tạo thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const updateUser = async (req, res) => {

    try {

        const { id } = req.params;

        let {
            full_name,
            email,
            role,
            phone,
            gender,
            date_of_birth,
            address,
            bio
        } = req.body;

        full_name = full_name?.trim();
        email = email?.trim().toLowerCase();
        phone = phone?.trim() || null;
        address = address?.trim() || null;
        bio = bio?.trim() || null;

        if (!full_name || !email) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ họ tên và email"
            });
        }

        if (full_name.length < 3) {
            return res.status(400).json({
                message: "Họ tên phải từ 3 ký tự trở lên"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        if (
            role &&
            role !== "admin" &&
            role !== "employee"
        ) {
            return res.status(400).json({
                message: "Role không hợp lệ"
            });
        }

        if (
            gender &&
            gender !== "male" &&
            gender !== "female" &&
            gender !== "other"
        ) {
            return res.status(400).json({
                message: "Giới tính không hợp lệ"
            });
        }

        const [users] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            `,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        const [existingEmail] = await db.query(
            `
            SELECT id
            FROM users
            WHERE email = ?
            AND id <> ?
            `,
            [email, id]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({
                message: "Email đã tồn tại"
            });
        }

        await db.query(
            `
            UPDATE users
            SET
                full_name = ?,
                email = ?,
                phone = ?,
                gender = ?,
                date_of_birth = ?,
                address = ?,
                bio = ?,
                role = ?
            WHERE id = ?
            `,
            [
                full_name,
                email,
                phone,
                gender || null,
                date_of_birth || null,
                address,
                bio,
                role || "employee",
                id
            ]
        );

        res.json({
            message: "Cập nhật thông tin người dùng thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Kiểm tra status hợp lệ
        if (
            status !== "active" &&
            status !== "inactive"
        ) {
            return res.status(400).json({
                message: "Status không hợp lệ"
            });
        }

        // Kiểm tra user tồn tại
        const [users] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thành viên"
            });
        }

        // Cập nhật status
        await db.query(
            "UPDATE users SET status = ? WHERE id = ?",
            [status, id]
        );

        res.json({
            message: "Cập nhật trạng thái thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // Lấy id người dùng từ tham số đường dẫn

        // Kiểm tra user có tồn tại
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thành viên"
            });
        }

        if (req.user.id == id) {
            return res.status(400).json({
                message: "Không thể xóa chính mình"
            });
        }

        // Xóa người dùng khỏi database
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({
            message: "Thành viên đã được xóa thành công"
        });
    } catch (error) {
        return handleServerError(res, error);
    }
}

const getAvailableUsersForEvent = async (req, res) => {

    try {

        const { eventId } = req.params;

        // Kiểm tra sự kiện tồn tại
        const [events] = await db.query(
            `
            SELECT
                id,
                leader_id
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            `,
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Chỉ Admin hoặc Leader của Event mới được xem danh sách nhân viên để thêm
        if (
            req.user.role !== "admin" &&
            req.user.id !== event.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xem danh sách nhân viên"
            });
        }

        // Lấy danh sách nhân viên chưa thuộc sự kiện
        const [users] = await db.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.role,
                u.status

            FROM users u

            WHERE u.role = 'employee'
            AND u.status = 'active'

            AND u.id <> ?

            AND u.id NOT IN (
                SELECT em.user_id
                FROM event_members em
                WHERE em.event_id = ?
            )

            ORDER BY u.full_name ASC
            `,
            [
                event.leader_id,
                eventId
            ]
        );

        res.json({
            total: users.length,
            users
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getMe = async (req, res) => {

    try {

        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                email,
                phone,
                gender,
                date_of_birth,
                address,
                bio,
                role,
                status,
                created_at,
                updated_at
            FROM users
            WHERE id = ?
            `,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        res.json({
            user: users[0]
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateStatus,
    deleteUser,
    getAvailableUsersForEvent,
    getMe
}