const db = require("../config/db");
const handleServerError = require("../utils/handleServerError");


/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ kiểm tra ID
|--------------------------------------------------------------------------
*/
const isValidId = (id) => {
    return (
        Number.isInteger(Number(id)) &&
        Number(id) > 0
    );
};

/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ lấy sự kiện
|--------------------------------------------------------------------------
*/
const getEventById = async (eventId) => {
    const [events] = await db.query(
        `
        SELECT id, title, status, leader_id, deleted_at
        FROM events
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
        `,
        [Number(eventId)]
    );
    return events.length > 0 ? events[0] : null;
};

/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ lấy timeline và sự kiện
|--------------------------------------------------------------------------
*/
const getTimelineContext = async (timelineId) => {
    const [timelines] = await db.query(
        `
        SELECT 
            et.id, et.event_id, et.title, et.description, et.created_by, et.created_at, et.updated_at,
            e.title AS event_title, e.status AS event_status, e.leader_id
        FROM event_timelines et
        INNER JOIN events e ON et.event_id = e.id
        WHERE et.id = ? AND e.deleted_at IS NULL
        LIMIT 1
        `,
        [Number(timelineId)]
    );
    return timelines.length > 0 ? timelines[0] : null;
};

/*
|--------------------------------------------------------------------------
| Kiểm tra quyền quản lý timeline
|--------------------------------------------------------------------------
*/
const canManageTimeline = (req, event) => {
    const isAdmin = req.user.role === "admin";
    const isLeader = Number(req.user.id) === Number(event.leader_id);
    return isAdmin || isLeader;
};

/*
|--------------------------------------------------------------------------
| 1. API Tạo timeline cho sự kiện (Chặn nếu Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const createTimeline = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { title, description } = req.body;

        if (!isValidId(eventId)) return res.status(400).json({ message: "Mã sự kiện không hợp lệ" });
        if (!title || !title.trim()) return res.status(400).json({ message: "Tiêu đề không được để trống" });

        const event = await getEventById(eventId);
        if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

        // Khóa tính năng tạo nếu sự kiện đã đóng/hủy
        if (event.status === "Đã kết thúc" || event.status === "Đã hủy") {
            return res.status(400).json({ message: "Không thể tạo lịch trình cho sự kiện đã kết thúc hoặc đã hủy" });
        }

        const isAdmin = req.user.role === "admin";
        const isLeader = Number(req.user.id) === Number(event.leader_id);

        if (!isAdmin && !isLeader) return res.status(403).json({ message: "Bạn không có quyền tạo timeline" });
        if (!isAdmin && event.status === "Nháp") {
            return res.status(403).json({ message: "Leader không thể tạo timeline khi sự kiện ở trạng thái Nháp" });
        }

        const [existing] = await db.query(`SELECT id FROM event_timelines WHERE event_id = ? LIMIT 1`, [Number(eventId)]);
        if (existing.length > 0) return res.status(400).json({ message: "Sự kiện này đã có lịch trình" });

        const [result] = await db.query(
            `INSERT INTO event_timelines (event_id, title, description, created_by) VALUES (?, ?, ?, ?)`,
            [Number(eventId), title.trim(), description?.trim() || null, req.user.id]
        );

        return res.status(201).json({
            message: "Tạo timeline thành công",
            timeline: { id: result.insertId, event_id: Number(eventId), title: title.trim() }
        });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 2. API Xem timeline của sự kiện
|--------------------------------------------------------------------------
*/
const getEventTimeline = async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!isValidId(eventId)) return res.status(400).json({ message: "Mã sự kiện không hợp lệ" });

        const event = await getEventById(eventId);
        if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

        const isAdmin = req.user.role === "admin";
        const isLeader = Number(req.user.id) === Number(event.leader_id);

        if (!isAdmin && event.status === "Nháp") {
            return res.status(403).json({ message: "Bạn không có quyền xem timeline của sự kiện Nháp" });
        }

        if (!isAdmin && !isLeader) {
            const [members] = await db.query(
                `SELECT user_id FROM event_members WHERE event_id = ? AND user_id = ? LIMIT 1`,
                [Number(eventId), req.user.id]
            );
            if (members.length === 0) return res.status(403).json({ message: "Bạn không phải thành viên sự kiện" });
        }

        const [timelines] = await db.query(
            `
            SELECT et.*, e.title AS event_title, e.status AS event_status, u.full_name AS created_by_name
            FROM event_timelines et
            INNER JOIN events e ON et.event_id = e.id
            INNER JOIN users u ON et.created_by = u.id
            WHERE et.event_id = ? AND e.deleted_at IS NULL LIMIT 1
            `,
            [Number(eventId)]
        );

        if (timelines.length === 0) return res.status(404).json({ message: "Sự kiện chưa có timeline" });
        const timeline = timelines[0];

        const [items] = await db.query(
            `
            SELECT ti.*, t.title AS task_title, t.status AS task_status, t.task_type, assigned_user.full_name AS assigned_name
            FROM timeline_items ti
            LEFT JOIN tasks t ON ti.task_id = t.id AND t.is_deleted = FALSE
            LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
            WHERE ti.timeline_id = ?
            ORDER BY ti.start_time ASC, ti.order_number ASC, ti.id ASC
            `,
            [timeline.id]
        );

        return res.status(200).json({ timeline, total_items: items.length, items });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 3. API Cập nhật thông tin timeline (Khóa khi Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const updateTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        if (!isValidId(id)) return res.status(400).json({ message: "Mã lịch trình không hợp lệ" });
        const timeline = await getTimelineContext(id);
        if (!timeline) return res.status(404).json({ message: "Không tìm thấy lịch trình" });

        if (timeline.event_status === "Đã kết thúc" || timeline.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Sự kiện đã kết thúc hoặc bị hủy, không thể sửa lịch trình!" });
        }

        if (!canManageTimeline(req, timeline)) return res.status(403).json({ message: "Bạn không có quyền sửa" });

        await db.query(
            `UPDATE event_timelines SET title = ?, description = ?, updated_at = NOW() WHERE id = ?`,
            [title.trim(), description?.trim() || null, Number(id)]
        );
        return res.status(200).json({ message: "Cập nhật timeline thành công" });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 4. API Xóa toàn bộ timeline (Khóa khi Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const deleteTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        const timeline = await getTimelineContext(id);
        if (!timeline) return res.status(404).json({ message: "Không tìm thấy lịch trình" });

        if (timeline.event_status === "Đã kết thúc" || timeline.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Sự kiện đã đóng, không thể xóa lịch trình!" });
        }

        if (!canManageTimeline(req, timeline)) return res.status(403).json({ message: "Quyền hạn từ chối" });

        await db.query(`DELETE FROM event_timelines WHERE id = ?`, [Number(id)]);
        return res.status(200).json({ message: "Xóa timeline thành công" });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 5. API Thêm mốc thời gian con (Khóa khi Đóng/Hủy + Ràng buộc Task sự kiện)
|--------------------------------------------------------------------------
*/
const addTimelineItem = async (req, res) => {
    try {
        const { timelineId } = req.params;
        const { task_id, title, description, start_time, end_time, order_number } = req.body; // Đã bỏ phase

        const timeline = await getTimelineContext(timelineId);
        if (!timeline) return res.status(404).json({ message: "Không tìm thấy timeline cha" });

        if (timeline.event_status === "Đã kết thúc" || timeline.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Sự kiện đã khép lại, không thể thêm mốc thời gian mới!" });
        }

        if (!canManageTimeline(req, timeline)) return res.status(403).json({ message: "Bạn không có quyền quản lý" });

        let linkedTask = null;
        if (task_id) {
            const [tasks] = await db.query(
                `SELECT id, event_id, title, description, task_type FROM tasks WHERE id = ? AND event_id = ? AND is_deleted = FALSE LIMIT 1`,
                [Number(task_id), timeline.event_id]
            );
            if (tasks.length === 0) return res.status(400).json({ message: "Công việc không tồn tại hoặc không thuộc sự kiện này phụ trách!" });
            linkedTask = tasks[0];
        }

        const itemTitle = title?.trim() || linkedTask?.title;

        if (!itemTitle) return res.status(400).json({ message: "Tiêu đề không được để trống" });

        const [result] = await db.query(
            `INSERT INTO timeline_items (timeline_id, task_id, title, description, start_time, end_time, order_number) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [Number(timelineId), linkedTask ? linkedTask.id : null, itemTitle, description?.trim() || linkedTask?.description || null, start_time, end_time, Number(order_number) || 0]
        );

        return res.status(201).json({ message: "Thêm mốc thành công", id: result.insertId });
    } catch (error) { return handleServerError(res, error); }
};
/*
|--------------------------------------------------------------------------
| 6. API Cập nhật mốc thời gian con (Khóa khi Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const updateTimelineItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { task_id, title, description, start_time, end_time, order_number } = req.body; // Đã bỏ phase

        const [items] = await db.query(
            `
            SELECT ti.*, et.event_id, e.status AS event_status, e.leader_id 
            FROM timeline_items ti
            INNER JOIN event_timelines et ON ti.timeline_id = et.id
            INNER JOIN events e ON et.event_id = e.id
            WHERE ti.id = ? AND e.deleted_at IS NULL LIMIT 1
            `,
            [Number(itemId)]
        );
        if (items.length === 0) return res.status(404).json({ message: "Không tìm thấy mốc" });
        const item = items[0];

        if (item.event_status === "Đã kết thúc" || item.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Sự kiện đã đóng băng dữ liệu, cấm chỉnh sửa mốc thời gian!" });
        }

        if (!canManageTimeline(req, item)) return res.status(403).json({ message: "Quyền hạn bị từ chối" });

        let newTaskId = task_id === undefined ? item.task_id : (task_id === null || task_id === "" ? null : Number(task_id));
        let linkedTask = null;
        if (newTaskId) {
            const [tasks] = await db.query(
                `SELECT id, event_id, title, task_type FROM tasks WHERE id = ? AND event_id = ? AND is_deleted = FALSE LIMIT 1`,
                [newTaskId, item.event_id]
            );
            if (tasks.length === 0) return res.status(400).json({ message: "Công việc không thuộc sự kiện phụ trách" });
            linkedTask = tasks[0];
        }

        const newTitle = title === undefined ? item.title : title.trim();

        await db.query(
            `UPDATE timeline_items SET task_id = ?, title = ?, description = ?, start_time = ?, end_time = ?, order_number = ?, updated_at = NOW() WHERE id = ?`,
            [newTaskId, newTitle, description === undefined ? item.description : description, start_time || item.start_time, end_time || item.end_time, order_number === undefined ? item.order_number : Number(order_number), Number(itemId)]
        );
        return res.status(200).json({ message: "Cập nhật mốc thành công" });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 7. API Xóa mốc thời gian con (Khóa khi Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const deleteTimelineItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const [items] = await db.query(
            `
            SELECT ti.id, e.status AS event_status, e.leader_id 
            FROM timeline_items ti
            INNER JOIN event_timelines et ON ti.timeline_id = et.id
            INNER JOIN events e ON et.event_id = e.id
            WHERE ti.id = ? AND e.deleted_at IS NULL LIMIT 1
            `,
            [Number(itemId)]
        );
        if (items.length === 0) return res.status(404).json({ message: "Mốc thời gian không tồn tại" });
        const item = items[0];

        if (item.event_status === "Đã kết thúc" || item.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Sự kiện đóng cứng, cấm xóa!" });
        }

        if (!canManageTimeline(req, item)) return res.status(403).json({ message: "Không có quyền" });

        await db.query(`DELETE FROM timeline_items WHERE id = ?`, [Number(itemId)]);
        return res.status(200).json({ message: "Xóa mốc lịch trình thành công" });
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| 8. API Sắp xếp lại thứ tự (Khóa khi Đóng/Hủy)
|--------------------------------------------------------------------------
*/
const reorderTimelineItems = async (req, res) => {
    let connection;
    try {
        const { timelineId } = req.params;
        const { items } = req.body;

        const timeline = await getTimelineContext(timelineId);
        if (!timeline) return res.status(404).json({ message: "Không tìm thấy timeline" });

        if (timeline.event_status === "Đã kết thúc" || timeline.event_status === "Đã hủy") {
            return res.status(403).json({ message: "Lịch trình đã đóng băng cấu trúc sắp xếp!" });
        }

        if (!canManageTimeline(req, timeline)) return res.status(403).json({ message: "Không có quyền" });

        connection = await db.getConnection();
        await connection.beginTransaction();
        for (const item of items) {
            await connection.query(
                `UPDATE timeline_items SET order_number = ?, updated_at = NOW() WHERE id = ? AND timeline_id = ?`,
                [Number(item.order_number), Number(item.id), Number(timelineId)]
            );
        }
        await connection.commit();
        return res.status(200).json({ message: "Sắp xếp thành công" });
    } catch (error) {
        if (connection) await connection.rollback();
        return handleServerError(res, error);
    } finally { if (connection) connection.release(); }
};

/*
|--------------------------------------------------------------------------
| ⚙️ THÊM MỚI: API Lấy ngữ cảnh cha (Fix triệt để lỗi 404 trang Add)
|--------------------------------------------------------------------------
*/
const getTimelineContextRoute = async (req, res) => {
    try {
        const { timelineId } = req.params;
        const context = await getTimelineContext(timelineId);
        if (!context) return res.status(404).json({ message: "Không tìm thấy lịch trình" });
        return res.status(200).json(context);
    } catch (error) { return handleServerError(res, error); }
};

/*
|--------------------------------------------------------------------------
| ⚙️ THÊM MỚI: API Lấy 1 mốc thời gian cụ thể (Fix triệt để lỗi 404 trang Edit)
|--------------------------------------------------------------------------
*/
const getTimelineItemRoute = async (req, res) => {
    try {
        const { itemId } = req.params;
        const [items] = await db.query(
            `
            SELECT ti.*, et.event_id, e.status AS event_status 
            FROM timeline_items ti
            INNER JOIN event_timelines et ON ti.timeline_id = et.id
            INNER JOIN events e ON et.event_id = e.id
            WHERE ti.id = ? AND e.deleted_at IS NULL LIMIT 1
            `,
            [Number(itemId)]
        );
        if (items.length === 0) return res.status(404).json({ message: "Không có mốc lịch trình này" });
        return res.status(200).json(items[0]);
    } catch (error) { return handleServerError(res, error); }
};

module.exports = {
    createTimeline,
    getEventTimeline,
    updateTimeline,
    deleteTimeline,
    addTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    reorderTimelineItems,
    getTimelineContextRoute, // Export
    getTimelineItemRoute     // Export
};