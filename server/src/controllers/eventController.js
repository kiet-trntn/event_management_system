const db = require("../config/db");

const createEvent = async (req, res) => {
    try {
        
        // Lấy thông tin sự kiện từ nội dung (body) do Client gửi lên
        const {
            title,
            description,
            location,
            start_date,
            end_date,
            max_members,
            leader_id
        } = req.body;

        // Kiểm tra rỗng các trường bắt buộc
        if (!title || !description || !location || !start_date || !end_date || !max_members || !leader_id) {
            return res.status(400).json({ 
                message: "Vui lòng nhập đầy đủ thông tin sự kiện" 
            });
        }

        // Kiểm tra ngày đảm bảo thời gian bắt đầu trước thời gian kết thúc
        if (
            new Date(start_date) >= new Date(end_date)
        ) {
            return res.status(400).json({
                message: "Ngày bắt đầu phải trước ngày kết thúc"
            });
        }

        // Kiểm tra người phụ trách (leader_id) có tồn tại trong cơ sở dữ liệu hay không
        if (leader_id) {

            // Tìm xem ID của người phụ trách có tồn tại trong bảng users hay không
            const [leader] = await db.query(
                `SELECT * FROM users WHERE id = ?`,
                [leader_id]
            )

            // Nếu mảng rỗng, tức là không tìm thấy người phụ trách với ID đó, trả về lỗi
            if (leader.length === 0) {
                return res.status(400).json({
                    message: "Người phụ trách không tồn tại"
                });
            }
        }

        // Thêm sự kiện vào cơ sở dữ liệu
        await db.query(
            `
            INSERT INTO events
            (
                title, 
                description, 
                location, 
                start_date, 
                end_date, 
                max_members, 
                leader_id, 
                created_by
            )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description, 
                location, 
                start_date, 
                end_date, 
                max_members || 0,   // Nếu không nhập số thành viên tối đa, mặc định là 0
                leader_id || null,  // Nếu không chọn leader, mặc định để trống (null)
                req.user.id         // ID của người đang đăng nhập thực hiện bấm tạo sự kiện
            ]
        )

        res.status(201).json({
            message: "Tạo sự kiện thành công"
        });
    } catch (error) {
        console.error("Lỗi khi tạo sự kiện:", error);
        res.status(500).json({
            message: "Đã xảy ra lỗi khi tạo sự kiện"
        });
    }
}

module.exports = {
    createEvent
}