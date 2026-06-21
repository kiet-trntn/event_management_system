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
        `;

        let params = [];

        if (event_id) {

            sql += `
                WHERE t.event_id = ?
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

module.exports = {
    getAllTasks,
    createTask
};