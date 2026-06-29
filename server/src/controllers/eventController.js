const db = require("../config/db");
const fs = require("fs");
const createNotification = require("../utils/createNotification");

const publishEvent = async (req, res) => {
    try {
        // 1. Lấy mã ID của sự kiện từ trên đường dẫn URL (Ví dụ: /api/events/publish/5 -> id là 5)
        const { id } = req.params;

        // 2. Tìm kiếm sự kiện trong Database dựa vào ID vừa lấy được
        const [events] = await db.query(
            "SELECT * FROM events WHERE id = ?",
            [id]
        );

        // Nếu mảng rỗng, nghĩa là không có sự kiện nào mang ID này trong hệ thống
        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện" // Báo lỗi và dừng lại
            });
        }

        // 3. Lấy ra thông tin của sự kiện tìm được
        const event = events[0];

        // 4. Kiểm tra trạng thái: Sự kiện bắt buộc phải đang ở trạng thái 'Nháp' mới được công bố
        if (event.status !== "Nháp") {
            return res.status(400).json({
                message: "Chỉ được công bố sự kiện ở trạng thái Nháp" // Nếu đã công bố hoặc đã hủy thì chặn lại
            });
        }

        // 5. Cập nhật trạng thái sự kiện từ 'Nháp' thành 'Sắp diễn ra' trong Database
        await db.query(
            `
            UPDATE events
            SET status = 'Sắp diễn ra'
            WHERE id = ?
            `,
            [id]
        );

        // Tạo thông báo khi sự kiện được công bố
        const receivers = new Set();

        // Thông báo cho Leader nếu người công bố không phải Leader
        if (event.leader_id && event.leader_id !== req.user.id) {
            receivers.add(event.leader_id);
        }

        // Lấy danh sách thành viên trong sự kiện
        const [members] = await db.query(
            `
            SELECT user_id
            FROM event_members
            WHERE event_id = ?
            AND user_id <> ?
            `,
            [id, req.user.id]
        );

        for (const member of members) {
            receivers.add(member.user_id);
        }

        // Gửi thông báo
        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Sự kiện đã được công bố",
                content: `${req.user.full_name} đã công bố sự kiện "${event.title}"`,
                type: "event",
                related_id: id
            });
        }

        res.json({
            message: "Công bố sự kiện thành công"
        });

    } catch (error) {

        // Trả về lỗi hệ thống nếu gặp lỗi bất ngờ (ví dụ: mất kết nối cơ sở dữ liệu)
        res.status(500).json({
            message: error.message
        });

    } 
}

const getAllEvents = async (req, res) => {
 
    try {
        let events;

        // Admin xem tất cả
        if (req.user.role === "admin") {

            [events] = await db.query(`
                SELECT
                    e.id,
                    e.title,
                    e.location,
                    e.start_date,
                    e.end_date,
                    e.max_members,
                    e.status,
                    u.full_name AS leader_name
                FROM events e
                LEFT JOIN users u
                    ON e.leader_id = u.id
                WHERE e.deleted_at IS NULL
                ORDER BY e.id DESC
            `);

        }
        // Employee không xem được sự kiện Nháp và chỉ xem được sự kiện tham gia
        else {

            [events] = await db.query(`
                SELECT DISTINCT

                    e.id,
                    e.title,
                    e.location,
                    e.start_date,
                    e.end_date,
                    e.max_members,
                    e.status,

                    u.full_name AS leader_name

                FROM events e

                LEFT JOIN users u
                    ON e.leader_id = u.id

                LEFT JOIN event_members em
                    ON e.id = em.event_id

                WHERE
                    e.deleted_at IS NULL

                    AND e.status <> 'Nháp'

                    AND (
                        em.user_id = ?
                        OR
                        e.leader_id = ?
                    )

                ORDER BY e.id DESC
            `,
            [
                req.user.id,
                req.user.id
            ]);

        }

        res.json({ events });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }
};

const getEventById = async (req, res) => {

    try {

        const { id } = req.params;

        const [events] = await db.query(
            `
            SELECT
                e.id,
                e.title,
                e.description,
                e.location,
                e.start_date,
                e.end_date,
                e.max_members,
                e.status,
                e.created_at,

                u1.id AS leader_id,
                u1.full_name AS leader_name,

                u2.id AS created_by_id,
                u2.full_name AS created_by_name

            FROM events e

            LEFT JOIN users u1
                ON e.leader_id = u1.id

            LEFT JOIN users u2
                ON e.created_by = u2.id

            WHERE e.id = ?
            AND e.deleted_at IS NULL
            `,
            [id]
        );

        // Không tìm thấy Event
        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Admin xem tất cả
        if (req.user.role === "admin") {
            return res.json(event);
        }

        // Kiểm tra Employee có thuộc Event không
        const [members] = await db.query(
            `
            SELECT *
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [
                id,
                req.user.id
            ]
        );

        // Kiểm tra Leader
        const isLeader =
            event.leader_id === req.user.id;

        // Không phải Member và không phải Leader
        if (
            members.length === 0 &&
            !isLeader
        ) {
            return res.status(403).json({
                message:
                    "Bạn không có quyền xem sự kiện này"
            });
        }

        // Employee không được xem Event Nháp
        if (event.status === "Nháp") {
            return res.status(403).json({
                message:
                    "Bạn không có quyền xem sự kiện này"
            });
        }

        res.json(event);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

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
            leader_id,
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
                status,
                created_by
            )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description, 
                location, 
                start_date, 
                end_date, 
                max_members || 0,   // Nếu không nhập số thành viên tối đa, mặc định là 0
                leader_id || null,  // Nếu không chọn leader, mặc định để trống (null)
                "Nháp",
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

const updateEvent = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            title,
            description,
            location,
            start_date,
            end_date,
            max_members,
            leader_id
        } = req.body;

        // Kiểm tra event tồn tại
        const [events] = await db.query(
            `SELECT *
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL`,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Chỉ cho sửa khi đang Nháp
        if (event.status !== "Nháp") {
            return res.status(400).json({
                message: "Chỉ được sửa sự kiện ở trạng thái Nháp"
            });
        }

        // Kiểm tra dữ liệu
        if (
            !title ||
            !location ||
            !start_date ||
            !end_date
        ) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        // Kiểm tra ngày
        if (
            new Date(start_date)
            >=
            new Date(end_date)
        ) {
            return res.status(400).json({
                message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
            });
        }

        // Kiểm tra leader
        if (leader_id) {

            const [leaders] = await db.query(
                "SELECT id FROM users WHERE id = ?",
                [leader_id]
            );

            if (leaders.length === 0) {
                return res.status(404).json({
                    message: "Leader không tồn tại"
                });
            }

        }

        await db.query(
            `
            UPDATE events
            SET
                title = ?,
                description = ?,
                location = ?,
                start_date = ?,
                end_date = ?,
                max_members = ?,
                leader_id = ?
            WHERE id = ?
            `,
            [
                title,
                description,
                location,
                start_date,
                end_date,
                max_members,
                leader_id,
                id
            ]
        );

        res.json({
            message: "Cập nhật sự kiện thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const cancelEvent = async (req, res) => {

    try {

        const { id } = req.params;

        const [events] = await db.query(
            "SELECT * FROM events WHERE id = ?",
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        if (event.status === "Đã hủy") {
            return res.status(400).json({
                message: "Sự kiện đã bị hủy trước đó"
            });
        }

        if (event.status === "Đã kết thúc") {
            return res.status(400).json({
                message: "Không thể hủy sự kiện đã kết thúc"
            });
        }

        await db.query(
            `
            UPDATE events
            SET status = 'Đã hủy'
            WHERE id = ?
            `,
            [id]
        );

        // Tạo thông báo khi sự kiện bị hủy
        const receivers = new Set();

        // Thông báo cho Leader nếu người hủy không phải Leader
        if (event.leader_id && event.leader_id !== req.user.id) {
            receivers.add(event.leader_id);
        }

        // Lấy danh sách thành viên của sự kiện
        const [members] = await db.query(
            `
            SELECT user_id
            FROM event_members
            WHERE event_id = ?
            AND user_id <> ?
            `,
            [id, req.user.id]
        );

        for (const member of members) {
            receivers.add(member.user_id);
        }

        // Gửi thông báo
        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Sự kiện đã bị hủy",
                content: `${req.user.full_name} đã hủy sự kiện "${event.title}"`,
                type: "event",
                related_id: id
            });
        }

        res.json({
            message: "Hủy sự kiện thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const deleteEvent = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra event tồn tại
        const [events] = await db.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            `,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        await db.query(
            `
            UPDATE events
            SET deleted_at = NOW()
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            message: "Xóa sự kiện thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const restoreEvent = async (req, res) => {

    try {

        const { id } = req.params;

        const [events] = await db.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            AND deleted_at IS NOT NULL
            `,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện đã xóa"
            });
        }

        await db.query(
            `
            UPDATE events
            SET deleted_at = NULL
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            message: "Khôi phục sự kiện thành công"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const getTrashEvents = async (req, res) => {

    try {

        const [events] = await db.query(`
            SELECT
                e.id,
                e.title,
                e.location,
                e.start_date,
                e.end_date,
                e.status,
                e.deleted_at
            FROM events e
            WHERE e.deleted_at IS NOT NULL
            ORDER BY e.deleted_at DESC
        `);

        res.json({
            events
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Thêm vào eventController.js
const getLeaderEventsForCalendar = async (req, res) => {
    try {
        const userId = req.user.id;
        const [events] = await db.query(
            `SELECT id, title, start_date, end_date, status 
             FROM events 
             WHERE leader_id = ? AND deleted_at IS NULL`,
            [userId]
        );
        res.json({ events });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const permanentDeleteEvent = async (req, res) => {

    try {

        const { id } = req.params;

        // Chỉ Admin nên được xóa vĩnh viễn sự kiện
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Chỉ Admin mới được xóa vĩnh viễn sự kiện"
            });
        }

        // Kiểm tra sự kiện có nằm trong thùng rác không
        const [events] = await db.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            AND deleted_at IS NOT NULL
            `,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện trong thùng rác"
            });
        }

        // Lấy danh sách task thuộc sự kiện
        const [tasks] = await db.query(
            `
            SELECT id
            FROM tasks
            WHERE event_id = ?
            `,
            [id]
        );

        const taskIds = tasks.map(task => task.id);

        if (taskIds.length > 0) {

            // Xóa file thật trong bảng attachments
            const [attachmentFiles] = await db.query(
                `
                SELECT file_path
                FROM attachments
                WHERE task_id IN (?)
                AND file_path IS NOT NULL
                `,
                [taskIds]
            );

            for (const file of attachmentFiles) {
                if (file.file_path && fs.existsSync(file.file_path)) {
                    fs.unlinkSync(file.file_path);
                }
            }

            // Xóa file thật trong bảng task_submissions nếu có
            try {

                const [submissionFiles] = await db.query(
                    `
                    SELECT file_path
                    FROM task_submissions
                    WHERE task_id IN (?)
                    AND file_path IS NOT NULL
                    `,
                    [taskIds]
                );

                for (const file of submissionFiles) {
                    if (file.file_path && fs.existsSync(file.file_path)) {
                        fs.unlinkSync(file.file_path);
                    }
                }

                await db.query(
                    `
                    DELETE FROM task_submissions
                    WHERE task_id IN (?)
                    `,
                    [taskIds]
                );

            } catch (error) {

                // Nếu chưa có bảng task_submissions thì bỏ qua
                if (error.code !== "ER_NO_SUCH_TABLE") {
                    throw error;
                }

            }

            // Xóa thông báo liên quan tới task
            await db.query(
                `
                DELETE FROM notifications
                WHERE type = 'task'
                AND related_id IN (?)
                `,
                [taskIds]
            );

            // Xóa lịch sử task
            await db.query(
                `
                DELETE FROM task_history
                WHERE task_id IN (?)
                `,
                [taskIds]
            );

            // Xóa file đính kèm trong DB
            await db.query(
                `
                DELETE FROM attachments
                WHERE task_id IN (?)
                `,
                [taskIds]
            );

            // Xóa task thuộc sự kiện
            await db.query(
                `
                DELETE FROM tasks
                WHERE event_id = ?
                `,
                [id]
            );

        }

        // Xóa thành viên sự kiện
        await db.query(
            `
            DELETE FROM event_members
            WHERE event_id = ?
            `,
            [id]
        );

        // Xóa notification liên quan tới event
        await db.query(
            `
            DELETE FROM notifications
            WHERE type = 'event'
            AND related_id = ?
            `,
            [id]
        );

        // Xóa sự kiện thật khỏi database
        await db.query(
            `
            DELETE FROM events
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            message: "Xóa vĩnh viễn sự kiện thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    publishEvent,
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    cancelEvent,
    getTrashEvents,
    getLeaderEventsForCalendar,
    permanentDeleteEvent
}