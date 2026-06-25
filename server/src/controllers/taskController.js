const db = require("../config/db");

const getAllTasks = async (req, res) => {

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

            WHERE t.is_deleted = FALSE
        `;

        let params = [];

        if (req.user.role !== "admin") {

            sql += `
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
                req.user.id
            );

        }

        if (event_id) {

            sql += `
                AND t.event_id = ?
            `;

            params.push(event_id);

        }

        sql += `
            ORDER BY t.id DESC
        `;

        const [tasks] =
            await db.query(sql, params);

        res.json({
            total: tasks.length,
            tasks
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const getTaskById = async (req, res) => {

    try {

        const { id } = req.params;

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

                u1.id AS assigned_to,
                u1.full_name AS assigned_name,

                u2.id AS created_by,
                u2.full_name AS created_by_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u1
                ON t.assigned_to = u1.id

            LEFT JOIN users u2
                ON t.created_by = u2.id

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
        const isLeader =
            task.leader_id === req.user.id;

        // Không phải member và không phải leader
        if (
            members.length === 0 &&
            !isLeader
        ) {
            return res.status(403).json({
                message:
                    "Bạn không có quyền xem công việc này"
            });
        }

        res.json(task);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

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
            SELECT *
            FROM events
            WHERE id = ?
            `,
            [event_id]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
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
        await db.query(
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

        res.status(201).json({
            message: "Tạo công việc thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

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
            SELECT *
            FROM tasks
            WHERE id = ?
            AND is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Không cho sửa task đã hoàn thành hoặc hủy
        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(400).json({
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
                due_date = ?
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

        res.json({
            message: "Cập nhật công việc thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

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
            SELECT *
            FROM tasks
            WHERE id = ?
            AND is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        if (
            req.user.role !== "admin" &&
            req.user.id !== task.assigned_to
        ) {
            return res.status(404).json({
                message: "Bạn không có quyền cập nhật công việc này"
            });
        }

        // Không cho đổi khi đã completed hoặc cancelled
        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(400).json({
                message: "Không thể thay đổi trạng thái công việc này"
            });
        }

        await db.query(
            `
            UPDATE tasks
            SET status = ?
            WHERE id = ?
            `,
            [status, id]
        );

        res.json({
            message: "Cập nhật trạng thái thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const deleteTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT *
            FROM tasks
            WHERE id = ?
            AND is_deleted = FALSE
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
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

        res.json({
            message: "Xóa công việc thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const restoreTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra task có tồn tại không
        const [tasks] = await db.query(
            `
            SELECT *
            FROM tasks
            WHERE id = ?
            `,
            [id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

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

        res.json({
            message: "Khôi phục công việc thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const getDeletedTasks = async (req, res) => {

    try {

        const [tasks] = await db.query(
            `
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

                u.id AS assigned_to,
                u.full_name AS assigned_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON t.assigned_to = u.id

            WHERE t.is_deleted = TRUE

            ORDER BY t.id DESC
            `
        );

        res.json({
            total: tasks.length,
            tasks
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getDeletedTasks
};