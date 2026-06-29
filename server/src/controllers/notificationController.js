const db = require("../config/db");

// Lấy danh sách thông báo của user đang đăng nhập
const getMyNotifications = async (req, res) => {

    try {

        const [notifications] = await db.query(
            `
            SELECT
                id,
                title,
                content,
                type,
                related_id,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json({
            total: notifications.length,
            notifications
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Đếm số thông báo chưa đọc
const getUnreadNotificationCount = async (req, res) => {

    try {

        const [result] = await db.query(
            `
            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE user_id = ?
            AND is_read = 0
            `,
            [req.user.id]
        );

        res.json({
            unread_count: result[0].unread_count
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Đánh dấu 1 thông báo là đã đọc
const markNotificationAsRead = async (req, res) => {

    try {

        const { id } = req.params;

        const [notifications] = await db.query(
            `
            SELECT id
            FROM notifications
            WHERE id = ?
            AND user_id = ?
            `,
            [id, req.user.id]
        );

        if (notifications.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo"
            });
        }

        await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
            AND user_id = ?
            `,
            [id, req.user.id]
        );

        res.json({
            message: "Đã đánh dấu thông báo là đã đọc"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Đánh dấu tất cả thông báo là đã đọc
const markAllNotificationsAsRead = async (req, res) => {

    try {

        await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
            `,
            [req.user.id]
        );

        res.json({
            message: "Đã đánh dấu tất cả thông báo là đã đọc"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Xóa 1 thông báo
const deleteNotification = async (req, res) => {

    try {

        const { id } = req.params;

        const [notifications] = await db.query(
            `
            SELECT id
            FROM notifications
            WHERE id = ?
            AND user_id = ?
            `,
            [id, req.user.id]
        );

        if (notifications.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo"
            });
        }

        await db.query(
            `
            DELETE FROM notifications
            WHERE id = ?
            AND user_id = ?
            `,
            [id, req.user.id]
        );

        res.json({
            message: "Xóa thông báo thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    getMyNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
};