const db = require("../config/db");
const { emitToUser } = require("../socket/socket");

const createNotification = async ({
    user_id,
    title,
    content,
    type = "system",
    related_id = null
}) => {

    const [result] = await db.query(
        `
        INSERT INTO notifications
        (user_id, title, content, type, related_id)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            user_id,
            title,
            content,
            type,
            related_id
        ]
    );

    const notification = {
        id: result.insertId,
        user_id,
        title,
        content,
        type,
        related_id,
        is_read: 0,
        created_at: new Date()
    };

    // Gửi realtime cho user nếu user đang online
    emitToUser(
        user_id,
        "new_notification",
        notification
    );

    return notification;
};

module.exports = createNotification;