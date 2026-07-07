const db = require("../config/db");
const addTaskHistory = require("../utils/taskHistory");
const createNotification = require("../utils/createNotification");
const fs = require("fs");
const handleServerError = require("../utils/handleServerError");

const getAllTasks = async (req, res) => {

    try {

        const {
            search,
            event_id,
            status,
            priority,
            assigned_to,
            from_date,
            to_date
        } = req.query;

        const validStatuses = [
            "pending",
            "in_progress",
            "submitted",
            "completed",
            "cancelled"
        ];

        const validPriorities = [
            "low",
            "medium",
            "high"
        ];

        // Kiểm tra status hợp lệ
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Trạng thái công việc không hợp lệ"
            });
        }

        // Kiểm tra priority hợp lệ
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        // Kiểm tra ngày lọc
        if (
            from_date &&
            to_date &&
            new Date(from_date) > new Date(to_date)
        ) {
            return res.status(400).json({
                message: "Ngày bắt đầu lọc không được lớn hơn ngày kết thúc lọc"
            });
        }

        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,

                e.id AS event_id,
                e.title AS event_title,
                e.status AS event_status,
                e.leader_id AS event_leader_id,

                u.id AS assigned_to,
                u.full_name AS assigned_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON t.assigned_to = u.id

            WHERE t.is_deleted = FALSE
            AND e.deleted_at IS NULL
        `;

        let params = [];

        // Phân quyền xem task
        if (req.user.role !== "admin") {

            sql += `
                AND (
                    e.status <> 'Nháp'
                    OR e.leader_id = ?
                )

                AND (
                    EXISTS (
                        SELECT 1
                        FROM event_members em
                        WHERE em.event_id = e.id
                        AND em.user_id = ?
                    )

                    OR

                    e.leader_id = ?
                )
            `;

            params.push(
                req.user.id,
                req.user.id,
                req.user.id
            );

        }

        // Tìm kiếm theo tên công việc hoặc mô tả
        if (search) {

            sql += `
                AND (
                    t.title LIKE ?
                    OR t.description LIKE ?
                )
            `;

            params.push(
                `%${search}%`,
                `%${search}%`
            );

        }

        // Lọc theo sự kiện
        if (event_id) {

            sql += `
                AND t.event_id = ?
            `;

            params.push(event_id);

        }

        // Lọc theo trạng thái
        if (status) {

            sql += `
                AND t.status = ?
            `;

            params.push(status);

        }

        // Lọc theo độ ưu tiên
        if (priority) {

            sql += `
                AND t.priority = ?
            `;

            params.push(priority);

        }

        // Lọc theo người được giao
        if (assigned_to) {

            sql += `
                AND t.assigned_to = ?
            `;

            params.push(assigned_to);

        }

        // Lọc từ ngày hạn hoàn thành
        if (from_date) {

            sql += `
                AND DATE(t.due_date) >= ?
            `;

            params.push(from_date);

        }

        // Lọc đến ngày hạn hoàn thành
        if (to_date) {

            sql += `
                AND DATE(t.due_date) <= ?
            `;

            params.push(to_date);

        }

        sql += `
            ORDER BY t.id DESC
        `;

        const [tasks] = await db.query(sql, params);

        res.json({
            total: tasks.length,
            tasks
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        // Câu lệnh SQL này đã thêm JOIN bảng task_submissions để lấy ID bài nộp
        const [tasks] = await db.query(
            `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,

                e.id AS event_id,
                e.title AS event_title,
                e.leader_id AS event_leader_id,

                u1.id AS assigned_to,
                u1.full_name AS assigned_name,

                u2.id AS created_by,
                u2.full_name AS created_by_name,

                -- PHẦN DỮ LIỆU BÀI NỘP QUAN TRỌNG ĐỂ FRONTEND KHÔNG BỊ LỖI UNDEFINED
                ts.id AS latest_submission_id,
                ts.content AS submission_content,
                ts.link_url AS submission_link_url,
                ts.file_name AS submission_file_name,
                ts.file_path AS submission_file_path,
                ts.file_type AS submission_file_type

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u1
                ON t.assigned_to = u1.id

            LEFT JOIN users u2
                ON t.created_by = u2.id

            -- JOIN ĐỂ LẤY BÀI NỘP MỚI NHẤT
            LEFT JOIN (
                SELECT ts1.*
                FROM task_submissions ts1
                INNER JOIN (
                    SELECT task_id, MAX(id) as max_id
                    FROM task_submissions
                    GROUP BY task_id
                ) ts2 ON ts1.id = ts2.max_id
            ) ts ON t.id = ts.task_id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Admin xem tất cả
        if (req.user.role === "admin") {
            return res.json(task);
        }

        // Kiểm tra user có thuộc Event không
        const [members] = await db.query(
            `
            SELECT *
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [
                task.event_id,
                req.user.id
            ]
        );

        // Leader Event
        const isLeader = task.event_leader_id === req.user.id;

        // Không phải member và không phải leader
        if (members.length === 0 && !isLeader) {
            return res.status(403).json({
                message: "Bạn không có quyền xem công việc này"
            });
        }

        res.json(task);

    } catch (error) {
        return handleServerError(res, error);
    }
};

const getMyTasks = async (req, res) => {

    try {

        // 1. Nhận tham số search từ URL
        const { search } = req.query;

        // 2. Câu lệnh SQL nền tảng của getMyTasks
        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,

                e.id AS event_id,
                e.title AS event_title,

                u.id AS assigned_to,
                u.full_name AS assigned_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON t.assigned_to = u.id

            WHERE
                t.is_deleted = FALSE
                AND t.assigned_to = ?
                AND e.deleted_at IS NULL
                AND e.status <> 'Nháp'
        `;

        // ID của người dùng đang đăng nhập luôn là tham số đầu tiên
        let params = [req.user.id];

        // 3. Logic tìm kiếm (Giống hệt getAllTasks)
        if (search) {

            sql += `
                AND (
                    t.title LIKE ?
                    OR t.description LIKE ?
                )
            `;

            params.push(
                `%${search}%`,
                `%${search}%`
            );

        }

        sql += `
            ORDER BY t.id DESC
        `;

        const [tasks] = await db.query(sql, params);

        res.json({
            total: tasks.length,
            tasks
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const createTask = async (req, res) => {

    try {

        const {
            event_id,
            title,
            description,
            assigned_to,
            priority,
            due_date
        } = req.body;

        // Kiểm tra rỗng
        if (!event_id || !title) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        // Kiểm tra event tồn tại
        const [events] = await db.query(
            `
            SELECT
                id,
                leader_id,
                deleted_at
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            `,
            [event_id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Chỉ Admin hoặc Leader của Event mới được tạo Task
        if (
            req.user.role !== "admin" &&
            req.user.id !== event.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền tạo công việc cho sự kiện này"
            });
        }

        // Kiểm tra priority
        if (
            priority &&
            priority !== "low" &&
            priority !== "medium" &&
            priority !== "high"
        ) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        // Kiểm tra người được giao
        if (assigned_to) {

            const [members] = await db.query(
                `
                SELECT *
                FROM event_members
                WHERE event_id = ?
                AND user_id = ?
                `,
                [event_id, assigned_to]
            );

            if (members.length === 0) {
                return res.status(400).json({
                    message: "Người được giao không thuộc sự kiện"
                });
            }

        }

        // Tạo task
        const [result] = await db.query(
            `
            INSERT INTO tasks (
                event_id,
                title,
                description,
                assigned_to,
                priority,
                due_date,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                event_id,
                title,
                description || null,
                assigned_to || null,
                priority || "medium",
                due_date || null,
                req.user.id
            ]
        );

        if (assigned_to) {
            await createNotification({
                user_id: assigned_to,
                title: "Bạn có công việc mới",
                content: `Bạn được giao công việc: "${title}"`,
                type: "task",
                related_id: result.insertId
            });
        }

        // Ghi lịch sử
        await addTaskHistory(
            result.insertId,
            `${req.user.full_name} đã tạo công việc`,
            req.user.id
        );

        res.status(201).json({
            message: "Tạo công việc thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const updateTask = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            title,
            description,
            assigned_to,
            priority,
            due_date
        } = req.body;

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin hoặc Leader của Event mới được sửa
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền chỉnh sửa công việc này"
            });
        }

        // Không cho sửa task đã hoàn thành hoặc hủy
        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(403).json({
                message: "Không thể chỉnh sửa công việc này"
            });
        }

        // Kiểm tra title
        if (!title) {
            return res.status(400).json({
                message: "Tiêu đề không được để trống"
            });
        }

        // Kiểm tra priority
        if (
            priority &&
            priority !== "low" &&
            priority !== "medium" &&
            priority !== "high"
        ) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        // Kiểm tra người được giao
        if (assigned_to) {

            const [members] = await db.query(
                `
                SELECT *
                FROM event_members
                WHERE event_id = ?
                AND user_id = ?
                `,
                [
                    task.event_id,
                    assigned_to
                ]
            );

            if (members.length === 0) {
                return res.status(400).json({
                    message: "Người được giao không thuộc sự kiện"
                });
            }

        }

        await db.query(
            `
            UPDATE tasks
            SET
                title = ?,
                description = ?,
                assigned_to = ?,
                priority = ?,
                due_date = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                title,
                description,
                assigned_to || null,
                priority || "medium",
                due_date || null,
                id
            ]
        );

        let assignedName = null;
        let oldAssignedName = null;

        // Lấy tên người được giao mới
        if (assigned_to) {

            const [users] = await db.query(
                `
                SELECT full_name
                FROM users
                WHERE id = ?
                `,
                [assigned_to]
            );

            if (users.length > 0) {
                assignedName = users[0].full_name;
            }

        }

        // Lấy tên người được giao cũ
        if (task.assigned_to) {

            const [oldUsers] = await db.query(
                `
                SELECT full_name
                FROM users
                WHERE id = ?
                `,
                [task.assigned_to]
            );

            if (oldUsers.length > 0) {
                oldAssignedName = oldUsers[0].full_name;
            }

        }

        // Nếu có thay đổi người được giao
        if (Number(assigned_to || 0) !== Number(task.assigned_to || 0)) {

            // Trường hợp giao cho người mới
            if (assigned_to) {

                await addTaskHistory(
                    id,
                    task.assigned_to
                        ? `${req.user.full_name} đã phân công lại công việc từ ${oldAssignedName} sang ${assignedName}`
                        : `${req.user.full_name} đã phân công công việc cho ${assignedName}`,
                    req.user.id
                );

                // Thông báo cho người mới
                await createNotification({
                    user_id: assigned_to,
                    title: "Bạn được giao công việc",
                    content: `Bạn được giao công việc: "${title}"`,
                    type: "task",
                    related_id: id
                });

            }

            // Trường hợp người cũ bị gỡ khỏi task
            if (task.assigned_to) {

                await createNotification({
                    user_id: task.assigned_to,
                    title: "Bạn không còn phụ trách công việc",
                    content: `Bạn không còn được phân công công việc: "${task.title}"`,
                    type: "task",
                    related_id: id
                });

            }

            // Thông báo cho Leader/người tạo task biết đã phân công lại
            const receivers = new Set();

            if (task.leader_id && Number(task.leader_id) !== Number(req.user.id)) {
                receivers.add(task.leader_id);
            }

            if (task.created_by && Number(task.created_by) !== Number(req.user.id)) {
                receivers.add(task.created_by);
            }

            // Không gửi trùng cho người mới và người cũ
            if (assigned_to) {
                receivers.delete(Number(assigned_to));
            }

            if (task.assigned_to) {
                receivers.delete(Number(task.assigned_to));
            }

            for (const userId of receivers) {
                await createNotification({
                    user_id: userId,
                    title: "Công việc đã được phân công lại",
                    content: `Công việc "${title}" đã được phân công lại cho ${assignedName || "chưa có người phụ trách"}`,
                    type: "task",
                    related_id: id
                });
            }

        }

        // Ghi lịch sử cập nhật chung
        await addTaskHistory(
            id,
            `${req.user.full_name} đã cập nhật công việc`,
            req.user.id
        );

        res.json({
            message: "Cập nhật công việc thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const updateTaskStatus = async (req, res) => {

    try {

        const { id } = req.params;

        const { status } = req.body;

        // Validate status
        const validStatus = [
            "pending",
            "in_progress",
            "submitted",
            "completed",
            "cancelled"
        ];

        if (!validStatus.includes(status)) {
            return res.status(400).json({
                message: "Trạng thái không hợp lệ"
            });
        }

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin, Leader hoặc người được giao mới được đổi trạng thái
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id &&
            req.user.id !== task.assigned_to
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền cập nhật công việc này"
            });
        }

        // Không cho đổi khi task đã hoàn thành hoặc hủy
        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(403).json({
                message:
                    "Công việc đã hoàn thành hoặc đã hủy"
            });
        }

        // Không cho cập nhật cùng trạng thái
        if (task.status === status) {
            return res.status(400).json({
                message:
                    "Trạng thái mới trùng với trạng thái hiện tại"
            });
        }

        if (status === "submitted") {
            return res.status(403).json({
                message: "Trạng thái chờ duyệt chỉ được tạo khi nhân viên nộp minh chứng"
            });
        }

        // Khi hoàn thành công việc cho nhân viên
        if (status === "completed") {
            return res.status(403).json({
                message: "Không thể tự chuyển sang hoàn thành. Vui lòng duyệt bài nộp để hoàn thành công việc"
            });
        }

        await db.query(
            `
            UPDATE tasks
            SET
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [status, id]
        );

        await addTaskHistory(
            id,
            `${req.user.full_name} đã chuyển trạng thái công việc "${task.title}" từ ${task.status} sang ${status}`,
            req.user.id
        );

        // Tạo thông báo khi trạng thái công việc thay đổi
        const receivers = new Set();

        // Thông báo cho Leader nếu người đổi trạng thái không phải Leader
        if (task.leader_id && task.leader_id !== req.user.id) {
            receivers.add(task.leader_id);
        }

        // Thông báo cho người tạo task nếu người đổi trạng thái không phải người tạo
        if (task.created_by && task.created_by !== req.user.id) {
            receivers.add(task.created_by);
        }

        // Thông báo cho người được giao nếu người đổi trạng thái không phải người được giao
        if (task.assigned_to && task.assigned_to !== req.user.id) {
            receivers.add(task.assigned_to);
        }

        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Trạng thái công việc đã thay đổi",
                content: `${req.user.full_name} đã chuyển công việc "${task.title}" từ ${task.status} sang ${status}`,
                type: "task",
                related_id: id
            });
        }

        res.json({
            message: "Cập nhật trạng thái thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const deleteTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin hoặc Leader của Event mới được xóa
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa công việc này"
            });
        }

        // Soft delete
        await db.query(
            `
            UPDATE tasks
            SET
                is_deleted = TRUE,
                deleted_at = NOW()
            WHERE id = ?
            `,
            [id]
        );

        await addTaskHistory(
            id,
            `${req.user.full_name} đã xóa công việc "${task.title}"`,
            req.user.id
        );

        // Tạo thông báo khi công việc bị xóa
        const receivers = new Set();

        // Thông báo cho người được giao task
        if (task.assigned_to && task.assigned_to !== req.user.id) {
            receivers.add(task.assigned_to);
        }

        // Nếu Admin xóa task thì thông báo cho Leader
        if (task.leader_id && task.leader_id !== req.user.id) {
            receivers.add(task.leader_id);
        }

        // Nếu người tạo task khác người xóa thì cũng thông báo
        if (task.created_by && task.created_by !== req.user.id) {
            receivers.add(task.created_by);
        }

        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Công việc đã bị xóa",
                content: `${req.user.full_name} đã xóa công việc "${task.title}"`,
                type: "task",
                related_id: id
            });
        }

        res.json({
            message: "Xóa công việc thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const restoreTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra task có tồn tại không
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin hoặc Leader của Event mới được khôi phục
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền khôi phục công việc này"
            });
        }

        // Kiểm tra đã bị xóa chưa
        if (!task.is_deleted) {
            return res.status(400).json({
                message: "Công việc chưa bị xóa"
            });
        }

        // Khôi phục
        await db.query(
            `
            UPDATE tasks
            SET
                is_deleted = FALSE,
                deleted_at = NULL
            WHERE id = ?
            `,
            [id]
        );

        await addTaskHistory(
            id,
            `${req.user.full_name} đã khôi phục công việc "${task.title}"`,
            req.user.id
        );

        // Tạo thông báo khi công việc được khôi phục
        const receivers = new Set();

        // Thông báo cho người được giao task
        if (task.assigned_to && task.assigned_to !== req.user.id) {
            receivers.add(task.assigned_to);
        }

        // Nếu Admin khôi phục thì thông báo cho Leader
        if (task.leader_id && task.leader_id !== req.user.id) {
            receivers.add(task.leader_id);
        }

        // Nếu người tạo task khác người khôi phục thì cũng thông báo
        if (task.created_by && task.created_by !== req.user.id) {
            receivers.add(task.created_by);
        }

        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Công việc đã được khôi phục",
                content: `${req.user.full_name} đã khôi phục công việc "${task.title}"`,
                type: "task",
                related_id: id
            });
        }

        res.json({
            message: "Khôi phục công việc thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getDeletedTasks = async (req, res) => {

    try {

        const { event_id } = req.query;

        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.deleted_at,

                e.id AS event_id,
                e.title AS event_title,
                e.leader_id AS event_leader_id,

                u.id AS assigned_to,
                u.full_name AS assigned_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON t.assigned_to = u.id

            WHERE t.is_deleted = TRUE
            AND t.deleted_at IS NOT NULL
            AND e.deleted_at IS NULL
        `;

        let params = [];

        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;

            params.push(req.user.id);
        }

        if (event_id) {
            sql += `
                AND t.event_id = ?
            `;

            params.push(event_id);
        }

        sql += `
            ORDER BY t.deleted_at DESC
        `;

        const [tasks] = await db.query(sql, params);

        res.json({
            total: tasks.length,
            tasks
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getTaskHistory = async (req, res) => {

    try {

        const { id } = req.params;

        const [history] = await db.query(
            `
            SELECT

                th.id,
                th.action,
                th.created_at,

                u.id AS user_id,
                u.full_name

            FROM task_history th

            INNER JOIN users u
                ON th.performed_by = u.id

            WHERE th.task_id = ?

            ORDER BY th.created_at DESC
            `,
            [id]
        );

        res.json({
            total: history.length,
            history
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const permanentDeleteTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id
            FROM tasks t
            INNER JOIN events e
                ON t.event_id = e.id
            WHERE t.id = ?
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin hoặc Leader của Event mới được xóa vĩnh viễn
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa vĩnh viễn công việc này"
            });
        }

        // Chỉ cho xóa vĩnh viễn khi task đang nằm trong thùng rác
        if (!task.is_deleted) {
            return res.status(400).json({
                message: "Công việc chưa nằm trong thùng rác, không thể xóa vĩnh viễn"
            });
        }

        // Lấy file trong bảng attachments để xóa file thật
        const [attachmentFiles] = await db.query(
            `
            SELECT file_path
            FROM attachments
            WHERE task_id = ?
            AND file_path IS NOT NULL
            `,
            [id]
        );

        for (const file of attachmentFiles) {
            if (file.file_path && fs.existsSync(file.file_path)) {
                fs.unlinkSync(file.file_path);
            }
        }

        // Nếu bạn đã làm bảng task_submissions thì xóa file minh chứng luôn
        try {
            const [submissionFiles] = await db.query(
                `
                SELECT file_path
                FROM task_submissions
                WHERE task_id = ?
                AND file_path IS NOT NULL
                `,
                [id]
            );

            for (const file of submissionFiles) {
                if (file.file_path && fs.existsSync(file.file_path)) {
                    fs.unlinkSync(file.file_path);
                }
            }

            await db.query(
                `
                DELETE FROM task_submissions
                WHERE task_id = ?
                `,
                [id]
            );

        } catch (error) {

            // Nếu chưa có bảng task_submissions thì bỏ qua
            if (error.code !== "ER_NO_SUCH_TABLE") {
                throw error;
            }

        }

        // Xóa dữ liệu liên quan trước
        await db.query(
            `
            DELETE FROM task_history
            WHERE task_id = ?
            `,
            [id]
        );

        await db.query(
            `
            DELETE FROM attachments
            WHERE task_id = ?
            `,
            [id]
        );

        // Xóa task thật khỏi database
        await db.query(
            `
            DELETE FROM tasks
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            message: "Xóa vĩnh viễn công việc thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

module.exports = {
    getAllTasks,
    getTaskById,
    getMyTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getDeletedTasks,
    getTaskHistory,
    permanentDeleteTask
};