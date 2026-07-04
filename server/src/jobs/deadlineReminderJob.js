const cron = require("node-cron");
const db = require("../config/db");
const createNotificationWithEmail = require("../utils/createNotificationWithEmail");

const toDateOnly = (dateValue) => {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDateKey = (dateValue) => {
    const date = new Date(dateValue);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDateTime = (dateValue) => {
    const date = new Date(dateValue);

    return date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false
    });
};

const sendDeadlineNotificationOnce = async ({
    task,
    userId,
    reminderKey,
    title,
    content
}) => {

    const [result] = await db.query(
        `
        INSERT IGNORE INTO task_deadline_reminder_logs
        (
            task_id,
            user_id,
            reminder_key
        )
        VALUES (?, ?, ?)
        `,
        [
            task.id,
            userId,
            reminderKey
        ]
    );

    // affectedRows = 0 nghĩa là đã gửi rồi, không gửi lại nữa
    if (result.affectedRows === 0) {
        return;
    }

    await createNotificationWithEmail({
        user_id: userId,
        title,
        content,
        type: "task",
        related_id: task.id,
        send_email: true
    });

};

const checkTaskDeadlines = async () => {

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
                t.assigned_to,
                t.created_by,

                e.id AS event_id,
                e.title AS event_title,
                e.status AS event_status,
                e.leader_id

            FROM tasks t

            INNER JOIN events e
                ON t.event_id = e.id

            WHERE t.is_deleted = FALSE
            AND t.due_date IS NOT NULL
            AND t.status NOT IN ('completed', 'cancelled')
            AND e.deleted_at IS NULL
            AND e.status <> 'Nháp'
            `
        );

        const today = toDateOnly(new Date());
        const todayKey = formatDateKey(new Date());

        for (const task of tasks) {

            const dueDate = toDateOnly(task.due_date);

            const diffDays = Math.floor(
                (dueDate - today) / (1000 * 60 * 60 * 24)
            );

            let reminderKey = null;
            let title = null;
            let content = null;

            if (diffDays === 3) {
                reminderKey = "deadline_3_days";
                title = "Công việc sắp đến hạn";
                content = `Công việc "${task.title}" trong sự kiện "${task.event_title}" sẽ đến hạn sau 3 ngày. Hạn: ${formatDateTime(task.due_date)}.`;
            }

            else if (diffDays === 1) {
                reminderKey = "deadline_1_day";
                title = "Công việc gần đến hạn";
                content = `Công việc "${task.title}" trong sự kiện "${task.event_title}" sẽ đến hạn vào ngày mai. Hạn: ${formatDateTime(task.due_date)}.`;
            }

            else if (diffDays === 0) {
                reminderKey = "deadline_today";
                title = "Công việc đến hạn hôm nay";
                content = `Công việc "${task.title}" trong sự kiện "${task.event_title}" đến hạn hôm nay. Hạn: ${formatDateTime(task.due_date)}.`;
            }

            else if (diffDays < 0) {
                reminderKey = `overdue_${todayKey}`;
                title = "Công việc đã quá hạn";
                content = `Công việc "${task.title}" trong sự kiện "${task.event_title}" đã quá hạn. Hạn ban đầu: ${formatDateTime(task.due_date)}. Vui lòng xử lý sớm.`;
            }

            if (!reminderKey) {
                continue;
            }

            const receivers = new Set();

            // Người được giao task
            if (task.assigned_to) {
                receivers.add(Number(task.assigned_to));
            }

            // Leader sự kiện
            if (task.leader_id) {
                receivers.add(Number(task.leader_id));
            }

            // Người tạo task
            if (task.created_by) {
                receivers.add(Number(task.created_by));
            }

            for (const userId of receivers) {
                await sendDeadlineNotificationOnce({
                    task,
                    userId,
                    reminderKey,
                    title,
                    content
                });
            }

        }

        console.log("Đã kiểm tra deadline công việc");

    } catch (error) {

        console.log("Lỗi kiểm tra deadline:", error);

    }

};

const startDeadlineReminderJob = () => {

    // Chạy mỗi giờ một lần
    cron.schedule(
        "0 * * * *",
        checkTaskDeadlines,
        {
            timezone: "Asia/Ho_Chi_Minh"
        }
    );

    console.log("Deadline reminder job đã khởi động");

};

module.exports = {
    startDeadlineReminderJob,
    checkTaskDeadlines
};