const db = require("../config/db");
const path = require("path");
const addTaskHistory = require("../utils/taskHistory");
const createNotification = require("../utils/createNotification");

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

        console.log(error);

        res.status(500).json({
            message: error.message
        });

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

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    submitTask,
    reviewSubmission
};