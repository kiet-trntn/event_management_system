const db = require("../config/db");
const addTaskHistory = require("../utils/taskHistory");
const createNotification = require("../utils/createNotification");
const fs = require("fs");
const handleServerError = require("../utils/handleServerError");
const VALID_TASK_TYPES = [
    "preparation",
    "during_event",
    "post_event"
];

const getAllTasks = async (req, res) => {
    try {
        const {
            search,
            event_id,
            status,
            priority,
            task_type,
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

        // Kiểm tra trạng thái công việc
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Trạng thái công việc không hợp lệ"
            });
        }

        // Kiểm tra độ ưu tiên
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        // Kiểm tra loại công việc
        if (
            task_type &&
            !VALID_TASK_TYPES.includes(task_type)
        ) {
            return res.status(400).json({
                message: "Loại công việc không hợp lệ"
            });
        }

        // Kiểm tra event_id
        if (
            event_id &&
            (
                !Number.isInteger(Number(event_id)) ||
                Number(event_id) <= 0
            )
        ) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        // Kiểm tra assigned_to
        if (
            assigned_to &&
            (
                !Number.isInteger(Number(assigned_to)) ||
                Number(assigned_to) <= 0
            )
        ) {
            return res.status(400).json({
                message: "Mã người được giao không hợp lệ"
            });
        }

        // Kiểm tra định dạng ngày bắt đầu
        if (
            from_date &&
            Number.isNaN(new Date(from_date).getTime())
        ) {
            return res.status(400).json({
                message: "Ngày bắt đầu lọc không hợp lệ"
            });
        }

        // Kiểm tra định dạng ngày kết thúc
        if (
            to_date &&
            Number.isNaN(new Date(to_date).getTime())
        ) {
            return res.status(400).json({
                message: "Ngày kết thúc lọc không hợp lệ"
            });
        }

        // Kiểm tra khoảng ngày
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
                t.task_type,
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

        const params = [];

        /*
         * Phân quyền xem công việc:
         * - Admin được xem tất cả.
         * - Leader/Employee không được xem sự kiện Nháp.
         * - Người dùng phải là thành viên hoặc Leader của sự kiện.
         */
        if (req.user.role !== "admin") {
            sql += `
                AND e.status <> 'Nháp'

                AND (
                    EXISTS (
                        SELECT 1
                        FROM event_members em
                        WHERE em.event_id = e.id
                        AND em.user_id = ?
                    )

                    OR e.leader_id = ?
                )
            `;

            params.push(
                req.user.id,
                req.user.id
            );
        }

        // Tìm kiếm theo tiêu đề hoặc mô tả
        if (search && search.trim()) {
            const keyword = `%${search.trim()}%`;

            sql += `
                AND (
                    t.title LIKE ?
                    OR t.description LIKE ?
                )
            `;

            params.push(keyword, keyword);
        }

        // Lọc theo sự kiện
        if (event_id) {
            sql += `
                AND t.event_id = ?
            `;

            params.push(Number(event_id));
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

        // Lọc theo loại công việc
        if (task_type) {
            sql += `
                AND t.task_type = ?
            `;

            params.push(task_type);
        }

        // Lọc theo người được giao
        if (assigned_to) {
            sql += `
                AND t.assigned_to = ?
            `;

            params.push(Number(assigned_to));
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

        return res.status(200).json({
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

        // Kiểm tra ID công việc
        if (
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0
        ) {
            return res.status(400).json({
                message: "Mã công việc không hợp lệ"
            });
        }

        // Lấy thông tin công việc và bài nộp mới nhất
        const [tasks] = await db.query(
            `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.task_type,
                t.due_date,
                t.created_at,
                t.updated_at,

                e.id AS event_id,
                e.title AS event_title,
                e.status AS event_status,
                e.leader_id AS event_leader_id,

                u1.id AS assigned_to,
                u1.full_name AS assigned_name,

                u2.id AS created_by,
                u2.full_name AS created_by_name,

                ts.id AS latest_submission_id,
                ts.content AS submission_content,
                ts.link_url AS submission_link_url,
                ts.file_name AS submission_file_name,
                ts.file_path AS submission_file_path,
                ts.file_type AS submission_file_type,
                ts.status AS submission_status,
                ts.created_at AS submission_created_at

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u1
                ON t.assigned_to = u1.id

            LEFT JOIN users u2
                ON t.created_by = u2.id

            LEFT JOIN (
                SELECT ts1.*
                FROM task_submissions ts1

                INNER JOIN (
                    SELECT
                        task_id,
                        MAX(id) AS max_id
                    FROM task_submissions
                    GROUP BY task_id
                ) ts2
                    ON ts1.id = ts2.max_id
            ) ts
                ON t.id = ts.task_id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            AND e.deleted_at IS NULL
            `,
            [Number(id)]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Admin được xem tất cả công việc
        if (req.user.role === "admin") {
            return res.status(200).json(task);
        }

        const isLeader =
            Number(task.event_leader_id) === Number(req.user.id);

        /*
         * Sự kiện Nháp:
         * - Leader phụ trách được xem nếu nghiệp vụ của bạn cho phép.
         * - Employee thông thường không được xem.
         */
        if (
            task.event_status === "Nháp" &&
            !isLeader
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xem công việc của sự kiện Nháp"
            });
        }

        // Kiểm tra người dùng có phải thành viên sự kiện không
        const [members] = await db.query(
            `
            SELECT id
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [
                task.event_id,
                req.user.id
            ]
        );

        const isMember = members.length > 0;

        // Không phải thành viên và cũng không phải Leader
        if (!isMember && !isLeader) {
            return res.status(403).json({
                message: "Bạn không có quyền xem công việc này"
            });
        }

        return res.status(200).json(task);

    } catch (error) {
        return handleServerError(res, error);
    }
};

const getMyTasks = async (req, res) => {
    try {
        const {
            search,
            task_type
        } = req.query;

        // Kiểm tra loại công việc
        if (
            task_type &&
            !VALID_TASK_TYPES.includes(task_type)
        ) {
            return res.status(400).json({
                message: "Loại công việc không hợp lệ"
            });
        }

        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.task_type,
                t.due_date,
                t.created_at,
                t.updated_at,

                e.id AS event_id,
                e.title AS event_title,
                e.status AS event_status,

                u.id AS assigned_to,
                u.full_name AS assigned_name

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON t.assigned_to = u.id

            WHERE t.is_deleted = FALSE
            AND t.assigned_to = ?
            AND e.deleted_at IS NULL
            AND e.status <> 'Nháp'
        `;

        const params = [
            req.user.id
        ];

        // Tìm kiếm theo tiêu đề hoặc mô tả
        if (search && search.trim()) {
            const keyword = `%${search.trim()}%`;

            sql += `
                AND (
                    t.title LIKE ?
                    OR t.description LIKE ?
                )
            `;

            params.push(
                keyword,
                keyword
            );
        }

        // Lọc theo loại công việc
        if (task_type) {
            sql += `
                AND t.task_type = ?
            `;

            params.push(task_type);
        }

        sql += `
            ORDER BY t.id DESC
        `;

        const [tasks] = await db.query(
            sql,
            params
        );

        return res.status(200).json({
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
            task_type,
            due_date
        } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (
            !event_id ||
            !title ||
            !title.trim() ||
            !task_type
        ) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        // Kiểm tra ID sự kiện
        if (
            !Number.isInteger(Number(event_id)) ||
            Number(event_id) <= 0
        ) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        // Kiểm tra ID người được giao
        if (
            assigned_to &&
            (
                !Number.isInteger(Number(assigned_to)) ||
                Number(assigned_to) <= 0
            )
        ) {
            return res.status(400).json({
                message: "Mã người được giao không hợp lệ"
            });
        }

        // Kiểm tra độ ưu tiên
        const validPriorities = [
            "low",
            "medium",
            "high"
        ];

        if (
            priority &&
            !validPriorities.includes(priority)
        ) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        // Kiểm tra loại công việc
        if (!VALID_TASK_TYPES.includes(task_type)) {
            return res.status(400).json({
                message: "Loại công việc không hợp lệ"
            });
        }

        // Kiểm tra hạn hoàn thành
        if (
            due_date &&
            Number.isNaN(new Date(due_date).getTime())
        ) {
            return res.status(400).json({
                message: "Hạn hoàn thành không hợp lệ"
            });
        }

        // Kiểm tra sự kiện
        const [events] = await db.query(
            `
            SELECT
                id,
                title,
                status,
                leader_id,
                deleted_at
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            LIMIT 1
            `,
            [Number(event_id)]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Không tạo công việc cho sự kiện đã kết thúc hoặc đã hủy
        if (
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            return res.status(400).json({
                message: "Không thể tạo công việc cho sự kiện đã kết thúc hoặc đã hủy"
            });
        }

        const isAdmin = req.user.role === "admin";

        const isLeader =
            Number(req.user.id) === Number(event.leader_id);

        // Chỉ Admin hoặc Leader của sự kiện được tạo công việc
        if (!isAdmin && !isLeader) {
            return res.status(403).json({
                message: "Bạn không có quyền tạo công việc cho sự kiện này"
            });
        }

        // Leader không được quản lý sự kiện Nháp
        if (!isAdmin && event.status === "Nháp") {
            return res.status(403).json({
                message: "Leader không thể tạo công việc khi sự kiện đang ở trạng thái Nháp"
            });
        }

        // Kiểm tra người được giao
        if (assigned_to) {
            const [members] = await db.query(
                `
                SELECT
                    em.user_id,
                    u.full_name,
                    u.status
                FROM event_members em

                INNER JOIN users u
                    ON em.user_id = u.id

                WHERE em.event_id = ?
                AND em.user_id = ?
                AND u.role = 'employee'
                AND u.status = 'active'
                LIMIT 1
                `,
                [
                    Number(event_id),
                    Number(assigned_to)
                ]
            );

            if (members.length === 0) {
                return res.status(400).json({
                    message: "Người được giao không phải thành viên đang hoạt động của sự kiện"
                });
            }
        }

        // Tạo công việc
        const [result] = await db.query(
            `
            INSERT INTO tasks (
                event_id,
                title,
                description,
                assigned_to,
                priority,
                task_type,
                due_date,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                Number(event_id),
                title.trim(),
                description?.trim() || null,
                assigned_to ? Number(assigned_to) : null,
                priority || "medium",
                task_type,
                due_date || null,
                req.user.id
            ]
        );

        // Gửi thông báo cho người được giao
        if (assigned_to) {
            await createNotification({
                user_id: Number(assigned_to),
                title: "Bạn có công việc mới",
                content: `Bạn được giao công việc: "${title.trim()}"`,
                type: "task",
                related_id: result.insertId
            });
        }

        // Ghi lịch sử tạo công việc
        await addTaskHistory(
            result.insertId,
            `${req.user.full_name} đã tạo công việc "${title.trim()}"`,
            req.user.id
        );

        return res.status(201).json({
            message: "Tạo công việc thành công",
            task: {
                id: result.insertId,
                event_id: Number(event_id),
                title: title.trim(),
                priority: priority || "medium",
                task_type,
                assigned_to: assigned_to
                    ? Number(assigned_to)
                    : null,
                status: "pending"
            }
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
            task_type,
            due_date
        } = req.body;

        // Kiểm tra ID công việc
        if (
            !Number.isInteger(Number(id)) ||
            Number(id) <= 0
        ) {
            return res.status(400).json({
                message: "Mã công việc không hợp lệ"
            });
        }

        // Kiểm tra task tồn tại
        const [tasks] = await db.query(
            `
            SELECT
                t.*,
                e.leader_id,
                e.status AS event_status

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            AND e.deleted_at IS NULL

            LIMIT 1
            `,
            [Number(id)]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        const isAdmin = req.user.role === "admin";

        const isLeader =
            Number(req.user.id) === Number(task.leader_id);

        // Chỉ Admin hoặc Leader của Event mới được sửa
        if (!isAdmin && !isLeader) {
            return res.status(403).json({
                message: "Bạn không có quyền chỉnh sửa công việc này"
            });
        }

        // Leader không được quản lý sự kiện Nháp
        if (!isAdmin && task.event_status === "Nháp") {
            return res.status(403).json({
                message: "Leader không thể chỉnh sửa công việc khi sự kiện đang ở trạng thái Nháp"
            });
        }

        // Không cho sửa task đã hoàn thành hoặc hủy
        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(403).json({
                message: "Không thể chỉnh sửa công việc đã hoàn thành hoặc đã hủy"
            });
        }

        // Kiểm tra tiêu đề
        if (
            !title ||
            !title.trim()
        ) {
            return res.status(400).json({
                message: "Tiêu đề không được để trống"
            });
        }

        const validPriorities = [
            "low",
            "medium",
            "high"
        ];

        // Giữ priority cũ nếu frontend không gửi
        const newPriority =
            priority || task.priority || "medium";

        // Kiểm tra priority
        if (!validPriorities.includes(newPriority)) {
            return res.status(400).json({
                message: "Độ ưu tiên không hợp lệ"
            });
        }

        /*
         * Giữ task_type cũ nếu frontend chưa gửi trường này.
         * Điều này tránh làm frontend cũ bị lỗi.
         */
        const newTaskType =
            task_type || task.task_type;

        // Kiểm tra loại công việc
        if (!VALID_TASK_TYPES.includes(newTaskType)) {
            return res.status(400).json({
                message: "Loại công việc không hợp lệ"
            });
        }

        // Kiểm tra hạn hoàn thành
        if (
            due_date &&
            Number.isNaN(new Date(due_date).getTime())
        ) {
            return res.status(400).json({
                message: "Hạn hoàn thành không hợp lệ"
            });
        }

        /*
         * Nếu không gửi assigned_to thì giữ người cũ.
         * Nếu gửi null hoặc chuỗi rỗng thì gỡ người phụ trách.
         */
        let newAssignedTo;

        if (assigned_to === undefined) {
            newAssignedTo = task.assigned_to;
        } else if (
            assigned_to === null ||
            assigned_to === ""
        ) {
            newAssignedTo = null;
        } else {
            if (
                !Number.isInteger(Number(assigned_to)) ||
                Number(assigned_to) <= 0
            ) {
                return res.status(400).json({
                    message: "Mã người được giao không hợp lệ"
                });
            }

            newAssignedTo = Number(assigned_to);
        }

        // Kiểm tra người được giao
        if (newAssignedTo) {
            const [members] = await db.query(
                `
                SELECT
                    em.user_id,
                    u.full_name,
                    u.status

                FROM event_members em

                INNER JOIN users u
                    ON em.user_id = u.id

                WHERE em.event_id = ?
                AND em.user_id = ?
                AND u.role = 'employee'
                AND u.status = 'active'

                LIMIT 1
                `,
                [
                    task.event_id,
                    newAssignedTo
                ]
            );

            if (members.length === 0) {
                return res.status(400).json({
                    message: "Người được giao không phải thành viên đang hoạt động của sự kiện"
                });
            }
        }

        const newDescription =
            description === undefined
                ? task.description
                : description?.trim() || null;

        const newDueDate =
            due_date === undefined
                ? task.due_date
                : due_date || null;

        // Cập nhật công việc
        await db.query(
            `
            UPDATE tasks
            SET
                title = ?,
                description = ?,
                assigned_to = ?,
                priority = ?,
                task_type = ?,
                due_date = ?,
                updated_at = NOW()

            WHERE id = ?
            `,
            [
                title.trim(),
                newDescription,
                newAssignedTo,
                newPriority,
                newTaskType,
                newDueDate,
                Number(id)
            ]
        );

        let assignedName = null;
        let oldAssignedName = null;

        // Lấy tên người được giao mới
        if (newAssignedTo) {
            const [users] = await db.query(
                `
                SELECT full_name
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [newAssignedTo]
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
                LIMIT 1
                `,
                [task.assigned_to]
            );

            if (oldUsers.length > 0) {
                oldAssignedName = oldUsers[0].full_name;
            }
        }

        const assignedChanged =
            Number(newAssignedTo || 0) !==
            Number(task.assigned_to || 0);

        // Nếu có thay đổi người được giao
        if (assignedChanged) {
            // Giao cho người mới
            if (newAssignedTo) {
                await addTaskHistory(
                    Number(id),
                    task.assigned_to
                        ? `${req.user.full_name} đã phân công lại công việc từ ${oldAssignedName || "người phụ trách cũ"} sang ${assignedName}`
                        : `${req.user.full_name} đã phân công công việc cho ${assignedName}`,
                    req.user.id
                );

                await createNotification({
                    user_id: newAssignedTo,
                    title: "Bạn được giao công việc",
                    content: `Bạn được giao công việc: "${title.trim()}"`,
                    type: "task",
                    related_id: Number(id)
                });
            } else {
                // Gỡ người phụ trách
                await addTaskHistory(
                    Number(id),
                    `${req.user.full_name} đã gỡ ${oldAssignedName || "người phụ trách"} khỏi công việc`,
                    req.user.id
                );
            }

            // Thông báo cho người cũ
            if (task.assigned_to) {
                await createNotification({
                    user_id: Number(task.assigned_to),
                    title: "Bạn không còn phụ trách công việc",
                    content: `Bạn không còn được phân công công việc: "${task.title}"`,
                    type: "task",
                    related_id: Number(id)
                });
            }

            // Thông báo cho Leader và người tạo task
            const receivers = new Set();

            if (
                task.leader_id &&
                Number(task.leader_id) !== Number(req.user.id)
            ) {
                receivers.add(Number(task.leader_id));
            }

            if (
                task.created_by &&
                Number(task.created_by) !== Number(req.user.id)
            ) {
                receivers.add(Number(task.created_by));
            }

            // Không gửi trùng cho người mới và người cũ
            if (newAssignedTo) {
                receivers.delete(Number(newAssignedTo));
            }

            if (task.assigned_to) {
                receivers.delete(Number(task.assigned_to));
            }

            for (const userId of receivers) {
                await createNotification({
                    user_id: userId,
                    title: newAssignedTo
                        ? "Công việc đã được phân công lại"
                        : "Công việc đã được gỡ người phụ trách",
                    content: newAssignedTo
                        ? `Công việc "${title.trim()}" đã được phân công cho ${assignedName}`
                        : `Công việc "${title.trim()}" hiện chưa có người phụ trách`,
                    type: "task",
                    related_id: Number(id)
                });
            }
        }

        // Ghi lịch sử khi thay đổi loại công việc
        if (task.task_type !== newTaskType) {
            const taskTypeLabels = {
                preparation: "Chuẩn bị",
                during_event: "Diễn ra",
                post_event: "Kết thúc"
            };

            await addTaskHistory(
                Number(id),
                `${req.user.full_name} đã thay đổi loại công việc từ "${taskTypeLabels[task.task_type] || task.task_type}" sang "${taskTypeLabels[newTaskType]}"`,
                req.user.id
            );
        }

        // Ghi lịch sử cập nhật chung
        await addTaskHistory(
            Number(id),
            `${req.user.full_name} đã cập nhật công việc "${title.trim()}"`,
            req.user.id
        );

        return res.status(200).json({
            message: "Cập nhật công việc thành công",
            task: {
                id: Number(id),
                title: title.trim(),
                description: newDescription,
                assigned_to: newAssignedTo,
                priority: newPriority,
                task_type: newTaskType,
                due_date: newDueDate
            }
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
        const {
            event_id,
            task_type
        } = req.query;

        // Kiểm tra loại công việc nếu có truyền bộ lọc
        if (
            task_type &&
            !VALID_TASK_TYPES.includes(task_type)
        ) {
            return res.status(400).json({
                message: "Loại công việc không hợp lệ"
            });
        }

        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.task_type,
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

        const params = [];

        // Leader chỉ xem công việc đã xóa của sự kiện mình phụ trách
        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;

            params.push(req.user.id);
        }

        // Lọc theo sự kiện
        if (event_id) {
            sql += `
                AND t.event_id = ?
            `;

            params.push(event_id);
        }

        // Lọc theo loại công việc
        if (task_type) {
            sql += `
                AND t.task_type = ?
            `;

            params.push(task_type);
        }

        sql += `
            ORDER BY t.deleted_at DESC
        `;

        const [tasks] = await db.query(sql, params);

        return res.status(200).json({
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