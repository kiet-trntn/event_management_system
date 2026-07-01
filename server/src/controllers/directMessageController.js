const db = require("../config/db");
const createNotification = require("../utils/createNotification");
const { emitToUser } = require("../socket/socket");

// Gửi tin nhắn riêng
const sendDirectMessage = async (req, res) => {

    try {

        const {
            receiver_id,
            content
        } = req.body;

        if (!receiver_id || !content || content.trim() === "") {
            return res.status(400).json({
                message: "Vui lòng nhập người nhận và nội dung tin nhắn"
            });
        }

        if (Number(receiver_id) === Number(req.user.id)) {
            return res.status(400).json({
                message: "Không thể tự nhắn tin cho chính mình"
            });
        }

        // Kiểm tra người nhận tồn tại
        const [receivers] = await db.query(
            `
            SELECT id, full_name, email, status
            FROM users
            WHERE id = ?
            `,
            [receiver_id]
        );

        if (receivers.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người nhận"
            });
        }

        const receiver = receivers[0];

        if (receiver.status === "inactive") {
            return res.status(400).json({
                message: "Tài khoản người nhận đang bị khóa"
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO direct_messages
            (
                sender_id,
                receiver_id,
                content
            )
            VALUES (?, ?, ?)
            `,
            [
                req.user.id,
                receiver_id,
                content.trim()
            ]
        );

        const messageData = {
            id: result.insertId,
            sender_id: req.user.id,
            sender_name: req.user.full_name,
            receiver_id: Number(receiver_id),
            receiver_name: receiver.full_name,
            content: content.trim(),
            is_read: 0,
            created_at: new Date()
        };

        // Realtime cho người nhận
        emitToUser(
            receiver_id,
            "new_direct_message",
            messageData
        );

        // Realtime lại cho người gửi nếu người gửi đang mở nhiều tab/thiết bị
        emitToUser(
            req.user.id,
            "new_direct_message",
            messageData
        );

        // Tạo notification cho người nhận
        await createNotification({
            user_id: receiver_id,
            title: "Tin nhắn mới",
            content: `${req.user.full_name} đã gửi cho bạn một tin nhắn`,
            type: "message",
            related_id: result.insertId
        });

        res.status(201).json({
            message: "Gửi tin nhắn thành công",
            data: messageData
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Xem cuộc trò chuyện giữa mình và một user khác
const getConversationWithUser = async (req, res) => {

    try {

        const { userId } = req.params;

        // Kiểm tra user kia tồn tại
        const [users] = await db.query(
            `
            SELECT id, full_name, email
            FROM users
            WHERE id = ?
            `,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        const otherUser = users[0];

        const [messages] = await db.query(
            `
            SELECT
                dm.id,
                dm.sender_id,
                sender.full_name AS sender_name,

                dm.receiver_id,
                receiver.full_name AS receiver_name,

                dm.content,
                dm.is_read,
                dm.read_at,
                dm.created_at

            FROM direct_messages dm

            INNER JOIN users sender
                ON dm.sender_id = sender.id

            INNER JOIN users receiver
                ON dm.receiver_id = receiver.id

            WHERE
            (
                dm.sender_id = ?
                AND dm.receiver_id = ?
                AND dm.is_deleted_by_sender = FALSE
            )
            OR
            (
                dm.sender_id = ?
                AND dm.receiver_id = ?
                AND dm.is_deleted_by_receiver = FALSE
            )

            ORDER BY dm.created_at ASC
            `,
            [
                req.user.id,
                userId,
                userId,
                req.user.id
            ]
        );

        // Đánh dấu đã đọc các tin nhắn user kia gửi cho mình
        await db.query(
            `
            UPDATE direct_messages
            SET
                is_read = TRUE,
                read_at = NOW()
            WHERE sender_id = ?
            AND receiver_id = ?
            AND is_read = FALSE
            `,
            [
                userId,
                req.user.id
            ]
        );

        res.json({
            user: otherUser,
            total: messages.length,
            messages
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Xem danh sách cuộc trò chuyện
const getMyConversations = async (req, res) => {

    try {

        const [conversations] = await db.query(
            `
            SELECT
                other_user.id AS user_id,
                other_user.full_name,
                other_user.email,

                last_msg.content AS last_message,
                last_msg.created_at AS last_message_time,

                (
                    SELECT COUNT(*)
                    FROM direct_messages unread
                    WHERE unread.sender_id = other_user.id
                    AND unread.receiver_id = ?
                    AND unread.is_read = FALSE
                    AND unread.is_deleted_by_receiver = FALSE
                ) AS unread_count

            FROM users other_user

            INNER JOIN direct_messages last_msg
                ON last_msg.id = (
                    SELECT dm2.id
                    FROM direct_messages dm2
                    WHERE
                    (
                        dm2.sender_id = ?
                        AND dm2.receiver_id = other_user.id
                        AND dm2.is_deleted_by_sender = FALSE
                    )
                    OR
                    (
                        dm2.sender_id = other_user.id
                        AND dm2.receiver_id = ?
                        AND dm2.is_deleted_by_receiver = FALSE
                    )
                    ORDER BY dm2.created_at DESC
                    LIMIT 1
                )

            WHERE other_user.id <> ?

            ORDER BY last_msg.created_at DESC
            `,
            [
                req.user.id,
                req.user.id,
                req.user.id,
                req.user.id
            ]
        );

        res.json({
            total: conversations.length,
            conversations
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Xóa tin nhắn phía mình
const deleteDirectMessage = async (req, res) => {

    try {

        const { id } = req.params;

        const [messages] = await db.query(
            `
            SELECT *
            FROM direct_messages
            WHERE id = ?
            `,
            [id]
        );

        if (messages.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy tin nhắn"
            });
        }

        const message = messages[0];

        if (
            Number(req.user.id) !== Number(message.sender_id) &&
            Number(req.user.id) !== Number(message.receiver_id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa tin nhắn này"
            });
        }

        if (Number(req.user.id) === Number(message.sender_id)) {
            await db.query(
                `
                UPDATE direct_messages
                SET is_deleted_by_sender = TRUE
                WHERE id = ?
                `,
                [id]
            );
        }

        if (Number(req.user.id) === Number(message.receiver_id)) {
            await db.query(
                `
                UPDATE direct_messages
                SET is_deleted_by_receiver = TRUE
                WHERE id = ?
                `,
                [id]
            );
        }

        res.json({
            message: "Xóa tin nhắn thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    sendDirectMessage,
    getConversationWithUser,
    getMyConversations,
    deleteDirectMessage
};