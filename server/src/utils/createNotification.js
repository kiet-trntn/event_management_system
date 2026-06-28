const db = require("../config/db");

const createNotification = async ({
    user_id,
    title,
    content,
    type = "system",
    related_id = null
}) => {

    await db.query(
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

};

module.exports = createNotification;