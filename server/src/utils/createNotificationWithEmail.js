const db = require("../config/db");
const createNotification = require("./createNotification");
const sendEmail = require("./sendEmail");

const createNotificationWithEmail = async ({
    user_id,
    title,
    content,
    type,
    related_id,
    send_email = false
}) => {

    // 1. Luôn lưu thông báo trong hệ thống
    await createNotification({
        user_id,
        title,
        content,
        type,
        related_id
    });

    // 2. Nếu không cần gửi email thì dừng
    if (!send_email) {
        return;
    }

    // 3. Lấy email người nhận
    const [users] = await db.query(
        `
        SELECT
            full_name,
            email
        FROM users
        WHERE id = ?
        AND status = 'active'
        `,
        [user_id]
    );

    if (users.length === 0 || !users[0].email) {
        return;
    }

    const user = users[0];

    // 4. Gửi email
    await sendEmail({
        to: user.email,
        subject: title,
        text: content,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>${title}</h2>

                <p>Xin chào <b>${user.full_name}</b>,</p>

                <p>${content}</p>

                <hr />

                <p style="font-size: 13px; color: #666;">
                    Email này được gửi tự động từ hệ thống quản lý sự kiện.
                </p>
            </div>
        `
    });

};

module.exports = createNotificationWithEmail;