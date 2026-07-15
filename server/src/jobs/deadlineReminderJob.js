const cron = require("node-cron");
const db = require("../config/db");
const createNotificationWithEmail = require(
    "../utils/createNotificationWithEmail"
);

/*
|--------------------------------------------------------------------------
| CẤU HÌNH TEST
|--------------------------------------------------------------------------
| true  = kiểm tra mỗi phút
| false = kiểm tra mỗi giờ
*/
const TEST_MODE = true;

const DAY_IN_MILLISECONDS =
    24 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| Đưa thời gian về 00:00:00 để so sánh theo ngày
|--------------------------------------------------------------------------
*/
const toDateOnly = (dateValue) => {
    const date = new Date(dateValue);

    date.setHours(0, 0, 0, 0);

    return date;
};

/*
|--------------------------------------------------------------------------
| Tạo chuỗi ngày YYYY-MM-DD
|--------------------------------------------------------------------------
*/
const formatDateKey = (dateValue) => {
    const date = new Date(dateValue);

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

/*
|--------------------------------------------------------------------------
| Hiển thị ngày giờ Việt Nam
|--------------------------------------------------------------------------
*/
const formatDateTime = (dateValue) => {
    const date = new Date(dateValue);

    return date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false
    });
};

/*
|--------------------------------------------------------------------------
| Gửi thông báo một lần
|--------------------------------------------------------------------------
*/
const sendDeadlineNotificationOnce = async ({
    task,
    userId,
    reminderKey,
    title,
    content
}) => {
    /*
     * INSERT IGNORE chỉ chống gửi trùng khi bảng có UNIQUE:
     * task_id + user_id + reminder_key
     */
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
            Number(task.id),
            Number(userId),
            reminderKey
        ]
    );

    /*
     * affectedRows = 0 nghĩa là reminder này
     * đã được gửi cho người này.
     */
    if (result.affectedRows === 0) {
        console.log(
            `[DEADLINE] Bỏ qua vì đã gửi: ` +
            `task=${task.id}, user=${userId}, key=${reminderKey}`
        );

        return;
    }

    try {
        await createNotificationWithEmail({
            user_id: Number(userId),
            title,
            content,
            type: "task",
            related_id: Number(task.id),
            send_email: true
        });

        console.log(
            `[DEADLINE] Đã gửi: ` +
            `task=${task.id}, user=${userId}, key=${reminderKey}`
        );
    } catch (error) {
        /*
         * Nếu gửi email hoặc thông báo lỗi,
         * xóa log để cron lần sau thử lại.
         */
        await db.query(
            `
            DELETE FROM task_deadline_reminder_logs
            WHERE task_id = ?
            AND user_id = ?
            AND reminder_key = ?
            `,
            [
                Number(task.id),
                Number(userId),
                reminderKey
            ]
        );

        console.error(
            `[DEADLINE] Gửi thất bại: ` +
            `task=${task.id}, user=${userId}`,
            error
        );
    }
};

/*
|--------------------------------------------------------------------------
| Kiểm tra deadline công việc
|--------------------------------------------------------------------------
*/
const checkTaskDeadlines = async () => {
    const currentTime = new Date();

    console.log(
        "\n========================================"
    );

    console.log(
        `[DEADLINE] Bắt đầu kiểm tra lúc: ` +
        formatDateTime(currentTime)
    );

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
            AND t.status NOT IN (
                'completed',
                'cancelled'
            )
            AND e.deleted_at IS NULL
            AND e.status <> 'Nháp'
            `
        );

        console.log(
            `[DEADLINE] Tìm thấy ${tasks.length} công việc cần kiểm tra`
        );

        const now = new Date();

        const today =
            toDateOnly(now);

        const todayKey =
            formatDateKey(now);

        for (const task of tasks) {
            const dueDateTime =
                new Date(task.due_date);

            /*
             * Tránh lỗi nếu database chứa ngày không hợp lệ.
             */
            if (
                Number.isNaN(
                    dueDateTime.getTime()
                )
            ) {
                console.log(
                    `[DEADLINE] Task ${task.id} có deadline không hợp lệ`
                );

                continue;
            }

            const dueDateOnly =
                toDateOnly(dueDateTime);

            const diffDays = Math.floor(
                (
                    dueDateOnly.getTime() -
                    today.getTime()
                ) /
                DAY_IN_MILLISECONDS
            );

            console.log({
                task_id: task.id,
                title: task.title,
                status: task.status,
                event_status: task.event_status,
                due_date: formatDateTime(
                    task.due_date
                ),
                current_time: formatDateTime(
                    now
                ),
                diff_days: diffDays
            });

            let reminderKey = null;
            let title = null;
            let content = null;

            /*
             * Quan trọng:
             * Kiểm tra quá hạn theo đúng ngày và giờ trước.
             *
             * Ví dụ:
             * Deadline: 09:52
             * Hiện tại: 10:00
             * => quá hạn.
             */
            if (dueDateTime.getTime() < now.getTime()) {
                reminderKey =
                    `overdue_${todayKey}`;

                title =
                    "Công việc đã quá hạn";

                content =
                    `Công việc "${task.title}" ` +
                    `trong sự kiện "${task.event_title}" ` +
                    `đã quá hạn. ` +
                    `Hạn hoàn thành: ` +
                    `${formatDateTime(task.due_date)}. ` +
                    `Vui lòng xử lý sớm.`;
            }

            /*
             * Còn đúng 3 ngày.
             */
            else if (diffDays === 3) {
                reminderKey =
                    "deadline_3_days";

                title =
                    "Công việc sắp đến hạn";

                content =
                    `Công việc "${task.title}" ` +
                    `trong sự kiện "${task.event_title}" ` +
                    `sẽ đến hạn sau 3 ngày. ` +
                    `Hạn: ${formatDateTime(task.due_date)}.`;
            }

            else if (diffDays === 2) {
                reminderKey = "deadline_2_days";
                title = "Công việc sắp đến hạn";
                content =
                    `Công việc "${task.title}" ` +
                    `trong sự kiện "${task.event_title}" ` +
                    `sẽ đến hạn sau 2 ngày. ` +
                    `Hạn: ${formatDateTime(task.due_date)}.`;
            }

            /*
             * Còn đúng 1 ngày.
             */
            else if (diffDays === 1) {
                reminderKey =
                    "deadline_1_day";

                title =
                    "Công việc gần đến hạn";

                content =
                    `Công việc "${task.title}" ` +
                    `trong sự kiện "${task.event_title}" ` +
                    `sẽ đến hạn vào ngày mai. ` +
                    `Hạn: ${formatDateTime(task.due_date)}.`;
            }

            /*
             * Đến hạn trong hôm nay nhưng chưa quá giờ.
             */
            else if (diffDays === 0) {
                reminderKey =
                    "deadline_today";

                title =
                    "Công việc đến hạn hôm nay";

                content =
                    `Công việc "${task.title}" ` +
                    `trong sự kiện "${task.event_title}" ` +
                    `đến hạn hôm nay. ` +
                    `Hạn: ${formatDateTime(task.due_date)}.`;
            }

            /*
             * Không thuộc mốc cần thông báo.
             */
            if (!reminderKey) {
                console.log(
                    `[DEADLINE] Task ${task.id} chưa đến mốc thông báo`
                );

                continue;
            }

            /*
             * Set giúp không gửi trùng nếu:
             * - Leader cũng là người tạo.
             * - Leader cũng là người được giao.
             */
            const receivers = new Set();

            if (task.assigned_to) {
                receivers.add(
                    Number(task.assigned_to)
                );
            }

            if (task.leader_id) {
                receivers.add(
                    Number(task.leader_id)
                );
            }

            if (task.created_by) {
                receivers.add(
                    Number(task.created_by)
                );
            }

            if (receivers.size === 0) {
                console.log(
                    `[DEADLINE] Task ${task.id} không có người nhận`
                );

                continue;
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

        console.log(
            "[DEADLINE] Đã kiểm tra xong deadline công việc"
        );
    } catch (error) {
        console.error(
            "[DEADLINE] Lỗi kiểm tra deadline:",
            error
        );
    }

    console.log(
        "========================================\n"
    );
};

/*
|--------------------------------------------------------------------------
| Khởi động cron job
|--------------------------------------------------------------------------
*/
const startDeadlineReminderJob = () => {
    /*
     * Chế độ test:
     * "* * * * *" = chạy mỗi phút.
     *
     * Chế độ thật:
     * "0 * * * *" = chạy vào phút 00 mỗi giờ.
     */
    const cronExpression = TEST_MODE
        ? "* * * * *"
        : "0 * * * *";

    cron.schedule(
        cronExpression,
        checkTaskDeadlines,
        {
            timezone:
                "Asia/Ho_Chi_Minh"
        }
    );

    console.log(
        TEST_MODE
            ? "Deadline reminder đang chạy TEST mỗi phút"
            : "Deadline reminder đang chạy mỗi giờ"
    );

    /*
     * Chạy ngay một lần lúc backend vừa khởi động,
     * không cần chờ đến phút tiếp theo.
     */
    checkTaskDeadlines();
};

module.exports = {
    startDeadlineReminderJob,
    checkTaskDeadlines
};