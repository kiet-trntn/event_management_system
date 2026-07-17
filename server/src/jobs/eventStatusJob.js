const cron = require("node-cron");
const db = require("../config/db");
const createNotification = require("../utils/createNotification");

/*
|--------------------------------------------------------------------------
| Gửi thông báo cho Leader và thành viên sự kiện
|--------------------------------------------------------------------------
*/
const notifyEventUsers = async ({
    eventId,
    leaderId,
    title,
    notificationTitle,
    notificationContent
}) => {
    const receivers = new Set();

    if (leaderId) {
        receivers.add(Number(leaderId));
    }

    const [members] = await db.query(
        `
        SELECT user_id
        FROM event_members
        WHERE event_id = ?
        `,
        [Number(eventId)]
    );

    for (const member of members) {
        receivers.add(Number(member.user_id));
    }

    for (const userId of receivers) {
        try {
            await createNotification({
                user_id: userId,
                title: notificationTitle,
                content:
                    notificationContent ||
                    `Sự kiện "${title}" đã thay đổi trạng thái`,
                type: "event",
                related_id: Number(eventId)
            });
        } catch (error) {
            console.error(
                `[EVENT STATUS] Không thể gửi thông báo cho user ${userId}:`,
                error.message
            );
        }
    }
};


/*
|--------------------------------------------------------------------------
| Kiểm tra và cập nhật trạng thái sự kiện
|--------------------------------------------------------------------------
*/
const updateEventStatuses = async () => {
    try {
        console.log(
            "[EVENT STATUS] Bắt đầu kiểm tra trạng thái sự kiện..."
        );

        /*
         * 1. Lấy những sự kiện đã tới giờ bắt đầu
         *
         * Điều kiện:
         * - Đang ở trạng thái Sắp diễn ra
         * - start_date <= thời gian hiện tại
         * - end_date vẫn chưa tới
         * - chưa bị xóa
         */
        const [startingEvents] = await db.query(
            `
            SELECT
                id,
                title,
                leader_id,
                start_date,
                end_date
            FROM events
            WHERE status = 'Sắp diễn ra'
            AND start_date <= NOW()
            AND end_date > NOW()
            AND deleted_at IS NULL
            `
        );

        /*
         * Chuyển từng sự kiện sang Đang diễn ra
         */
        for (const event of startingEvents) {
            await db.query(
                `
                UPDATE events
                SET status = 'Đang diễn ra'
                WHERE id = ?
                AND status = 'Sắp diễn ra'
                `,
                [event.id]
            );

            console.log(
                `[EVENT STATUS] Sự kiện ${event.id} chuyển sang Đang diễn ra`
            );

            await notifyEventUsers({
                eventId: event.id,
                leaderId: event.leader_id,
                title: event.title,
                notificationTitle:
                    "Sự kiện đang diễn ra",
                notificationContent:
                    `Sự kiện "${event.title}" đã bắt đầu`
            });
        }

        /*
         * 2. Lấy những sự kiện đã tới hoặc vượt giờ kết thúc
         *
         * Cho phép cập nhật từ:
         * - Sắp diễn ra
         * - Đang diễn ra
         *
         * Có cả Sắp diễn ra để xử lý trường hợp server tắt
         * trong suốt thời gian sự kiện.
         */
        const [endingEvents] = await db.query(
            `
            SELECT
                id,
                title,
                leader_id,
                start_date,
                end_date
            FROM events
            WHERE status IN (
                'Sắp diễn ra',
                'Đang diễn ra'
            )
            AND end_date <= NOW()
            AND deleted_at IS NULL
            `
        );

        /*
         * Chuyển từng sự kiện sang Đã kết thúc
         */
        for (const event of endingEvents) {
            await db.query(
                `
                UPDATE events
                SET status = 'Đã kết thúc'
                WHERE id = ?
                AND status IN (
                    'Sắp diễn ra',
                    'Đang diễn ra'
                )
                `,
                [event.id]
            );

            console.log(
                `[EVENT STATUS] Sự kiện ${event.id} chuyển sang Đã kết thúc`
            );

            await notifyEventUsers({
                eventId: event.id,
                leaderId: event.leader_id,
                title: event.title,
                notificationTitle:
                    "Sự kiện đã kết thúc",
                notificationContent:
                    `Sự kiện "${event.title}" đã kết thúc`
            });
        }

        console.log(
            `[EVENT STATUS] Đang diễn ra: ${startingEvents.length}, ` +
            `Đã kết thúc: ${endingEvents.length}`
        );

    } catch (error) {
        console.error(
            "[EVENT STATUS] Lỗi cập nhật trạng thái sự kiện:",
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| Khởi động cron job
|--------------------------------------------------------------------------
*/
const startEventStatusJob = () => {
    /*
     * Chạy mỗi phút.
     *
     * * * * * *
     * │ │ │ │ │
     * │ │ │ │ └─ thứ
     * │ │ │ └─── tháng
     * │ │ └───── ngày
     * │ └─────── giờ
     * └───────── phút
     */
    cron.schedule(
        "* * * * *",
        updateEventStatuses,
        {
            timezone: "Asia/Ho_Chi_Minh"
        }
    );

    console.log(
        "[EVENT STATUS] Job cập nhật trạng thái đã khởi động"
    );

    /*
     * Chạy ngay khi server bật.
     *
     * Nếu server bị tắt lúc sự kiện bắt đầu,
     * khi server bật lại nó sẽ cập nhật ngay,
     * không cần chờ sang phút tiếp theo.
     */
    updateEventStatuses();
};

module.exports = {
    startEventStatusJob,
    updateEventStatuses
};