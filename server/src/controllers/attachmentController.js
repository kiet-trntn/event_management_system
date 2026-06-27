const db = require("../config/db");
const path = require("path");
const fs = require("fs");
const addTaskHistory =
require("../utils/taskHistory");

const uploadAttachment = async (req, res) => {

    try {

        const {
            task_id
        } = req.body;

        // Kiểm tra có file không
        if (!req.file) {
            return res.status(400).json({
                message: "Vui lòng chọn file"
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
            [task_id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
            });
        }

        const task = tasks[0];

        // Chỉ Admin, Leader hoặc người được giao mới được upload file
        if (
            req.user.role !== "admin" &&
            req.user.id !== task.leader_id &&
            req.user.id !== task.assigned_to
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền tải file lên"
            });
        }

        // Lấy đuôi file
        const fileType =
            path.extname(
                req.file.originalname
            ).replace(".", "");

        // Lưu DB
        const [result] = await db.query(
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
                task_id,
                req.file.originalname,
                req.file.path,
                req.file.size,
                fileType,
                req.user.id
            ]
        );

        await addTaskHistory(
            task_id,
            `${req.user.full_name} đã tải lên tệp ${req.file.originalname}`,
            req.user.id
        );

        res.status(201).json({

            message:
                "Upload file thành công",

            attachment: {

                id: result.insertId,

                task_id,

                file_name:
                    req.file.originalname,

                file_size:
                    req.file.size,

                file_type:
                    fileType

            }

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const getAttachmentsByTask = async (req, res) => {

    try {

        const { id } = req.params;

        // Kiểm tra Task tồn tại
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

        // Lấy danh sách file
        const [attachments] = await db.query(
            `
            SELECT
                a.id,
                a.file_name,
                a.file_size,
                a.file_type,
                a.file_path,
                a.created_at,

                u.id AS uploaded_by_id,
                u.full_name AS uploaded_by_name

            FROM attachments a

            LEFT JOIN users u
                ON a.uploaded_by = u.id

            WHERE a.task_id = ?
            AND a.deleted_at IS NULL

            ORDER BY a.id DESC
            `,
            [id]
        );

        res.json({
            attachments
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const deleteAttachment = async (req, res) => {

    try {

        const { id } = req.params;

        const [attachments] = await db.query(
            `
            SELECT
                a.*,
                t.assigned_to,
                e.leader_id

            FROM attachments a

            INNER JOIN tasks t
                ON a.task_id = t.id

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE a.id = ?
            AND a.deleted_at IS NULL
            `,
            [id]
        );

        if (attachments.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy file"
            });
        }

        const attachment = attachments[0];

        // Chỉ Admin, Leader hoặc người upload được xóa file
        if (
            req.user.role !== "admin" &&
            req.user.id !== attachment.leader_id &&
            req.user.id !== attachment.uploaded_by
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa file này"
            });
        }

        await db.query(
            `
            UPDATE attachments
            SET deleted_at = NOW()
            WHERE id = ?
            `,
            [id]
        );

        await addTaskHistory(
            attachment.task_id,
            `Xóa tệp "${attachment.file_name}"`,
            req.user.id
        );

        res.json({
            message: "Xóa file thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const getDeletedAttachments = async (req, res) => {

    try {

        const [attachments] = await db.query(
            `
            SELECT
                a.id,
                a.file_name,
                a.file_size,
                a.file_type,
                a.deleted_at,

                u.id AS uploaded_by_id,
                u.full_name AS uploaded_by_name

            FROM attachments a

            LEFT JOIN users u
                ON a.uploaded_by = u.id

            WHERE a.deleted_at IS NOT NULL

            ORDER BY a.deleted_at DESC
            `
        );

        res.json({
            total: attachments.length,
            attachments
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const restoreAttachment = async (req, res) => {

    try {

        const { id } = req.params;

        // Lấy file đã bị xóa + lấy leader_id của sự kiện chứa task đó
        const [attachments] = await db.query(
            `
            SELECT
                a.id,
                a.task_id,
                a.file_name,
                a.file_path,
                a.deleted_at,

                t.id AS task_id,
                t.title AS task_title,

                e.id AS event_id,
                e.title AS event_title,
                e.leader_id

            FROM attachments a

            INNER JOIN tasks t
                ON a.task_id = t.id

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE a.id = ?
            AND a.deleted_at IS NOT NULL
            `,
            [id]
        );

        if (attachments.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy file đã xóa"
            });
        }

        const attachment = attachments[0];

        // Chỉ Admin hoặc Leader của sự kiện mới được khôi phục file
        if (
            req.user.role !== "admin" &&
            req.user.id !== attachment.leader_id
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền khôi phục file này"
            });
        }

        // Khôi phục file
        await db.query(
            `
            UPDATE attachments
            SET deleted_at = NULL
            WHERE id = ?
            `,
            [id]
        );

        // Ghi lịch sử nếu bạn đang dùng task_history
        await addTaskHistory(
            attachment.task_id,
            `${req.user.full_name} đã khôi phục tệp "${attachment.file_name}"`,
            req.user.id
        );

        res.json({
            message: "Khôi phục file thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const downloadAttachment = async (req, res) => {

    try {

        const { id } = req.params;

        const [attachments] = await db.query(
            `
            SELECT
                a.*,
                t.event_id,
                e.leader_id

            FROM attachments a

            INNER JOIN tasks t
                ON a.task_id = t.id

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE a.id = ?
            AND a.deleted_at IS NULL
            `,
            [id]
        );

        if (attachments.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy file"
            });
        }

        const attachment = attachments[0];

        // Admin tải mọi file
        if (req.user.role !== "admin") {

            const [members] = await db.query(
                `
                SELECT *
                FROM event_members
                WHERE event_id = ?
                AND user_id = ?
                `,
                [
                    attachment.event_id,
                    req.user.id
                ]
            );

            const isLeader =
                attachment.leader_id === req.user.id;

            if (
                members.length === 0 &&
                !isLeader
            ) {
                return res.status(403).json({
                    message:
                    "Bạn không có quyền tải file này"
                });
            }
        }

        console.log("file_path:", attachment.file_path);

        const filePath = attachment.file_path;

        console.log(filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message:
                "File không tồn tại trên server"
            });
        }

        res.download(
            filePath,
            attachment.file_name
        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};


module.exports = {
    uploadAttachment,
    getAttachmentsByTask,
    deleteAttachment,
    getDeletedAttachments,
    restoreAttachment,
    downloadAttachment
};