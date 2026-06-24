const db = require("../config/db");
const path = require("path");

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
            SELECT *
            FROM tasks
            WHERE id = ?
            AND is_deleted = FALSE
            `,
            [task_id]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy công việc"
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
                a.created_at,

                u.id AS uploaded_by_id,
                u.full_name AS uploaded_by_name

            FROM attachments a

            LEFT JOIN users u
                ON a.uploaded_by = u.id

            WHERE a.task_id = ?
            AND a.is_deleted = FALSE

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

module.exports = {
    uploadAttachment,
    getAttachmentsByTask
};