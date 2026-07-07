const db = require("../config/db");
const path = require("path");
const fs = require("fs");
const addTaskHistory = require("../utils/taskHistory");
const createNotification = require("../utils/createNotification");
const handleServerError = require("../utils/handleServerError");

// Nhân viên nộp minh chứng hoàn thành task
const submitTask = async (req, res) => {

    try {

        const {
            task_id,
            content,
            link_url
        } = req.body;

        if (!task_id) {
            return res.status(400).json({
                message: "Vui lòng chọn công việc"
            });
        }

        if (!content && !link_url && !req.file) {
            return res.status(400).json({
                message: "Vui lòng nhập nội dung, đường link hoặc tải lên file minh chứng"
            });
        }

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
            [task_id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ người được giao mới được nộp
        if (req.user.id !== task.assigned_to) {
            return res.status(403).json({
                message: "Chỉ người được giao công việc mới được nộp minh chứng"
            });
        }

        if (
            task.status === "completed" ||
            task.status === "cancelled"
        ) {
            return res.status(400).json({
                message: "Công việc đã hoàn thành hoặc đã hủy"
            });
        }

        let fileName = null;
        let filePath = null;
        let fileSize = null;
        let fileType = null;

        if (req.file) {
            fileName = req.file.originalname;
            filePath = req.file.path;
            fileSize = req.file.size;
            fileType = path.extname(req.file.originalname).replace(".", "");
        }

        const [result] = await db.query(
            `
            INSERT INTO task_submissions (
                task_id,
                submitted_by,
                content,
                link_url,
                file_name,
                file_path,
                file_size,
                file_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                task_id,
                req.user.id,
                content || null,
                link_url || null,
                fileName,
                filePath,
                fileSize,
                fileType
            ]
        );

        await db.query(
            `
            UPDATE tasks
            SET status = 'submitted',
                updated_at = NOW()
            WHERE id = ?
            `,
            [task_id]
        );

        await addTaskHistory(
            task_id,
            `${req.user.full_name} đã nộp minh chứng chờ duyệt`,
            req.user.id
        );

        const receivers = new Set();

        if (task.leader_id && task.leader_id !== req.user.id) {
            receivers.add(task.leader_id);
        }

        if (task.created_by && task.created_by !== req.user.id) {
            receivers.add(task.created_by);
        }

        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Có bài nộp mới cần duyệt",
                content: `${req.user.full_name} đã nộp minh chứng cho công việc "${task.title}"`,
                type: "task",
                related_id: task_id
            });
        }

        res.status(201).json({
            message: "Nộp minh chứng thành công, đang chờ duyệt",
            submission_id: result.insertId
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

// Leader/Admin duyệt bài nộp
const reviewSubmission = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            status,
            review_note
        } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Trạng thái duyệt không hợp lệ"
            });
        }

        const [submissions] = await db.query(
            `
            SELECT
                s.*,
                t.title AS task_title,
                t.event_id,
                e.leader_id
            FROM task_submissions s
            INNER JOIN tasks t
                ON s.task_id = t.id
            INNER JOIN events e
                ON t.event_id = e.id
            WHERE s.id = ?
            `,
            [id]
        );

        if (submissions.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy bài nộp"
            });
        }

        const submission = submissions[0];

        if (
            req.user.role !== "admin" &&
            req.user.id !== submission.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền duyệt bài nộp này"
            });
        }

        if (submission.status !== "pending") {
            return res.status(400).json({
                message: "Bài nộp này đã được xử lý trước đó"
            });
        }

        await db.query(
            `
            UPDATE task_submissions
            SET
                status = ?,
                review_note = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE id = ?
            `,
            [
                status,
                review_note || null,
                req.user.id,
                id
            ]
        );

        if (status === "approved") {

            await db.query(
                `
                UPDATE tasks
                SET status = 'completed',
                    updated_at = NOW()
                WHERE id = ?
                `,
                [submission.task_id]
            );

            // Nếu bài nộp có file thì chuyển file đó sang bảng attachments
            if (submission.file_name && submission.file_path) {

                // Kiểm tra tránh insert trùng file
                const [existingAttachments] = await db.query(
                    `
                    SELECT id
                    FROM attachments
                    WHERE task_id = ?
                    AND file_path = ?
                    LIMIT 1
                    `,
                    [
                        submission.task_id,
                        submission.file_path
                    ]
                );

                if (existingAttachments.length === 0) {

                    await db.query(
                        `
                        INSERT INTO attachments
                        (
                            task_id,
                            file_name,
                            file_path,
                            file_size,
                            file_type,
                            uploaded_by
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            submission.task_id,
                            submission.file_name,
                            submission.file_path,
                            submission.file_size,
                            submission.file_type,
                            submission.submitted_by
                        ]
                    );

                    await addTaskHistory(
                        submission.task_id,
                        `${req.user.full_name} đã duyệt và chuyển file minh chứng vào tài liệu đính kèm`,
                        req.user.id
                    );

                }

            }

            await addTaskHistory(
                submission.task_id,
                `${req.user.full_name} đã duyệt bài nộp và hoàn thành công việc`,
                req.user.id
            );

            await createNotification({
                user_id: submission.submitted_by,
                title: "Bài nộp đã được duyệt",
                content: `Bài nộp cho công việc "${submission.task_title}" đã được duyệt`,
                type: "task",
                related_id: submission.task_id
            });

        } else {

            await db.query(
                `
                UPDATE tasks
                SET status = 'in_progress',
                    updated_at = NOW()
                WHERE id = ?
                `,
                [submission.task_id]
            );

            await addTaskHistory(
                submission.task_id,
                `${req.user.full_name} đã từ chối bài nộp`,
                req.user.id
            );

            await createNotification({
                user_id: submission.submitted_by,
                title: "Bài nộp bị từ chối",
                content: `Bài nộp cho công việc "${submission.task_title}" bị từ chối. ${review_note || ""}`,
                type: "task",
                related_id: submission.task_id
            });

        }

        res.json({
            message: status === "approved"
                ? "Duyệt bài nộp thành công"
                : "Từ chối bài nộp thành công"
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const getPendingSubmissions = async (req, res) => {

    try {

        let sql = `
            SELECT
                s.id,
                s.task_id,
                s.submitted_by,
                s.content,
                s.link_url,
                s.file_name,
                s.file_path,
                s.file_size,
                s.file_type,
                s.status,
                s.created_at,

                t.title AS task_title,
                t.status AS task_status,
                t.priority,
                t.due_date,

                e.id AS event_id,
                e.title AS event_title,
                e.leader_id,

                u.full_name AS submitted_by_name,
                u.email AS submitted_by_email

            FROM task_submissions s

            INNER JOIN tasks t
                ON s.task_id = t.id

            INNER JOIN events e
                ON t.event_id = e.id

            LEFT JOIN users u
                ON s.submitted_by = u.id

            WHERE s.status = 'pending'
            AND t.is_deleted = FALSE
            AND e.deleted_at IS NULL
        `;

        let params = [];

        // Admin xem tất cả bài nộp chờ duyệt
        // Leader chỉ xem bài nộp thuộc sự kiện mình phụ trách
        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;

            params.push(req.user.id);
        }

        sql += `
            ORDER BY s.created_at DESC
        `;

        const [submissions] = await db.query(sql, params);

        res.json({
            total: submissions.length,
            submissions
        });

    } catch (error) {

        return handleServerError(res, error); 

    }

};

const getSubmissionsByTask = async (req, res) => {

    try {

        const { taskId } = req.params;

        // Kiểm tra task tồn tại + lấy quyền
        const [tasks] = await db.query(
            `
            SELECT
                t.id,
                t.title,
                t.assigned_to,
                t.is_deleted,

                e.id AS event_id,
                e.title AS event_title,
                e.leader_id,
                e.deleted_at AS event_deleted_at

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.id = ?
            AND t.is_deleted = FALSE
            AND e.deleted_at IS NULL
            `,
            [taskId]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin, Leader hoặc người được giao task được xem lịch sử nộp
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(task.leader_id) &&
            Number(req.user.id) !== Number(task.assigned_to)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xem bài nộp của công việc này"
            });
        }

        const [submissions] = await db.query(
            `
            SELECT
                s.id,
                s.task_id,
                s.submitted_by,
                s.content,
                s.link_url,
                s.file_name,
                s.file_path,
                s.file_size,
                s.file_type,
                s.status,
                s.review_note,
                s.reviewed_by,
                s.reviewed_at,
                s.created_at,
                s.updated_at,

                submitter.full_name AS submitted_by_name,
                submitter.email AS submitted_by_email,

                reviewer.full_name AS reviewed_by_name

            FROM task_submissions s

            LEFT JOIN users submitter
                ON s.submitted_by = submitter.id

            LEFT JOIN users reviewer
                ON s.reviewed_by = reviewer.id

            WHERE s.task_id = ?

            ORDER BY s.created_at DESC
            `,
            [taskId]
        );

        res.json({
            task: {
                id: task.id,
                title: task.title,
                event_id: task.event_id,
                event_title: task.event_title
            },
            total: submissions.length,
            submissions
        });

    } catch (error) {

        return handleServerError(res, error);

    }

};

const downloadSubmissionFile = async (req, res) => {

    try {

        const { id } = req.params;

        const [submissions] = await db.query(
            `
            SELECT
                s.*,

                t.id AS task_id,
                t.title AS task_title,
                t.assigned_to,

                e.id AS event_id,
                e.leader_id

            FROM task_submissions s

            INNER JOIN tasks t
                ON s.task_id = t.id

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE s.id = ?
            `,
            [id]
        );

        if (submissions.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy bài nộp"
            });
        }

        const submission = submissions[0];

        // Chỉ Admin, Leader hoặc người nộp được tải file
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(submission.leader_id) &&
            Number(req.user.id) !== Number(submission.submitted_by)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền tải file bài nộp này"
            });
        }

        // Nếu bài nộp chỉ có link/content, không có file
        if (!submission.file_path || !submission.file_name) {
            return res.status(400).json({
                message: "Bài nộp này không có file để tải"
            });
        }

        if (!fs.existsSync(submission.file_path)) {
            return res.status(404).json({
                message: "File không tồn tại trên server"
            });
        }

        res.download(
            submission.file_path,
            submission.file_name
        );

    } catch (error) {

        return handleServerError(res, error);

    }

};

module.exports = {
    submitTask,
    reviewSubmission,
    getPendingSubmissions,
    getSubmissionsByTask,
    downloadSubmissionFile
};