const db = require("../config/db");

// Thống kê tổng quan
const getOverviewReport = async (req, res) => {

    try {

        let eventCondition = "WHERE e.deleted_at IS NULL";
        let taskCondition = "WHERE t.is_deleted = FALSE";
        let params = [];

        // Nếu không phải admin thì chỉ thống kê event mình phụ trách
        if (req.user.role !== "admin") {
            eventCondition += " AND e.leader_id = ?";
            taskCondition += " AND e.leader_id = ?";
            params.push(req.user.id);
        }

        const [[eventStats]] = await db.query(
            `
            SELECT COUNT(*) AS total_events
            FROM events e
            ${eventCondition}
            `,
            req.user.role !== "admin" ? [req.user.id] : []
        );

        const [[taskStats]] = await db.query(
            `
            SELECT COUNT(*) AS total_tasks
            FROM tasks t
            INNER JOIN events e
                ON t.event_id = e.id
            ${taskCondition}
            AND e.deleted_at IS NULL
            `,
            req.user.role !== "admin" ? [req.user.id] : []
        );

        const [[completedTaskStats]] = await db.query(
            `
            SELECT COUNT(*) AS completed_tasks
            FROM tasks t
            INNER JOIN events e
                ON t.event_id = e.id
            ${taskCondition}
            AND e.deleted_at IS NULL
            AND t.status = 'completed'
            `,
            req.user.role !== "admin" ? [req.user.id] : []
        );

        const [[pendingSubmissionStats]] = await db.query(
            `
            SELECT COUNT(*) AS pending_submissions
            FROM task_submissions s
            INNER JOIN tasks t
                ON s.task_id = t.id
            INNER JOIN events e
                ON t.event_id = e.id
            WHERE s.status = 'pending'
            AND t.is_deleted = FALSE
            AND e.deleted_at IS NULL
            ${req.user.role !== "admin" ? "AND e.leader_id = ?" : ""}
            `,
            req.user.role !== "admin" ? [req.user.id] : []
        );

        res.json({
            total_events: eventStats.total_events,
            total_tasks: taskStats.total_tasks,
            completed_tasks: completedTaskStats.completed_tasks,
            pending_submissions: pendingSubmissionStats.pending_submissions
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Thống kê task theo trạng thái
const getTaskReport = async (req, res) => {

    try {

        let sql = `
            SELECT
                t.status,
                COUNT(*) AS total
            FROM tasks t
            INNER JOIN events e
                ON t.event_id = e.id
            WHERE t.is_deleted = FALSE
            AND e.deleted_at IS NULL
        `;

        let params = [];

        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;
            params.push(req.user.id);
        }

        sql += `
            GROUP BY t.status
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            report: rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Thống kê event theo trạng thái
const getEventReport = async (req, res) => {

    try {

        let sql = `
            SELECT
                e.status,
                COUNT(*) AS total
            FROM events e
            WHERE e.deleted_at IS NULL
        `;

        let params = [];

        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;
            params.push(req.user.id);
        }

        sql += `
            GROUP BY e.status
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            report: rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Thống kê bài nộp theo trạng thái duyệt
const getSubmissionReport = async (req, res) => {

    try {

        let sql = `
            SELECT
                s.status,
                COUNT(*) AS total
            FROM task_submissions s
            INNER JOIN tasks t
                ON s.task_id = t.id
            INNER JOIN events e
                ON t.event_id = e.id
            WHERE t.is_deleted = FALSE
            AND e.deleted_at IS NULL
        `;

        let params = [];

        if (req.user.role !== "admin") {
            sql += `
                AND e.leader_id = ?
            `;
            params.push(req.user.id);
        }

        sql += `
            GROUP BY s.status
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            report: rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    getOverviewReport,
    getTaskReport,
    getEventReport,
    getSubmissionReport
};