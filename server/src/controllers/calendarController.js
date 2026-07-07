const { createEvents } = require("ics");
const db = require("../config/db");
const handleServerError = require("../utils/handleServerError");

const formatDateToICSArray = (dateValue) => {
    const date = new Date(dateValue);

    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes()
    ];
};

const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let diffMinutes = Math.floor((end - start) / 1000 / 60);

    if (diffMinutes <= 0) {
        diffMinutes = 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return {
        hours,
        minutes
    };
};

const sendICSFile = (res, filename, value) => {
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );

    res.send(value);
};

// Xuất lịch sự kiện user được phép xem
const exportEventsCalendar = async (req, res) => {

    try {

        let sql = `
            SELECT DISTINCT
                e.id,
                e.title,
                e.description,
                e.location,
                e.start_date,
                e.end_date,
                e.status,
                e.leader_id
            FROM events e

            LEFT JOIN event_members em
                ON e.id = em.event_id

            WHERE e.deleted_at IS NULL
            AND e.status <> 'Nháp'
        `;

        let params = [];

        // Admin xem tất cả sự kiện đã công bố
        // Leader/Employee chỉ xem sự kiện mình là leader hoặc thành viên
        if (req.user.role !== "admin") {
            sql += `
                AND (
                    e.leader_id = ?
                    OR em.user_id = ?
                )
            `;

            params.push(
                req.user.id,
                req.user.id
            );
        }

        sql += `
            ORDER BY e.start_date ASC
        `;

        const [events] = await db.query(sql, params);

        const calendarEvents = events.map(event => ({
            title: `[Sự kiện] ${event.title}`,
            description:
                `Mô tả: ${event.description || "Không có"}\n` +
                `Trạng thái: ${event.status}`,
            location: event.location || "",
            start: formatDateToICSArray(event.start_date),
            duration: calculateDuration(event.start_date, event.end_date),
            uid: `event-${event.id}@event-management-system`
        }));

        const { error, value } = createEvents(calendarEvents);

        if (error) {
            console.log(error);

            return res.status(500).json({
                message: "Không thể tạo file lịch sự kiện"
            });
        }

        sendICSFile(res, "events-calendar.ics", value);

    } catch (error) {

        return handleServerError(res, error);

    }

};

// Xuất lịch công việc được giao cho user
const exportMyTasksCalendar = async (req, res) => {

    try {

        let sql = `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,

                e.title AS event_title,
                e.status AS event_status

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.is_deleted = FALSE
            AND e.deleted_at IS NULL
            AND e.status <> 'Nháp'
            AND t.due_date IS NOT NULL
        `;

        let params = [];

        // Admin có thể export toàn bộ task có hạn
        // Employee/Leader export task được giao cho mình
        if (req.user.role !== "admin") {
            sql += `
                AND t.assigned_to = ?
            `;

            params.push(req.user.id);
        }

        sql += `
            ORDER BY t.due_date ASC
        `;

        const [tasks] = await db.query(sql, params);

        const calendarTasks = tasks.map(task => ({
            title: `[Công việc] ${task.title}`,
            description:
                `Sự kiện: ${task.event_title}\n` +
                `Mô tả: ${task.description || "Không có"}\n` +
                `Trạng thái: ${task.status}\n` +
                `Độ ưu tiên: ${task.priority}`,
            start: formatDateToICSArray(task.due_date),
            duration: {
                minutes: 30
            },
            uid: `task-${task.id}@event-management-system`
        }));

        const { error, value } = createEvents(calendarTasks);

        if (error) {
            console.log(error);

            return res.status(500).json({
                message: "Không thể tạo file lịch công việc"
            });
        }

        sendICSFile(res, "my-tasks-calendar.ics", value);

    } catch (error) {

        return handleServerError(res, error);

    }

};

module.exports = {
    exportEventsCalendar,
    exportMyTasksCalendar
};