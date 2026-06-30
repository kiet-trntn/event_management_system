const db = require("../config/db");
const createNotification = require("../utils/createNotification");

// Hàm kiểm tra quyền xem/gửi tin nhắn trong event
const checkEventAccess = async (eventId, user) => {

    const [events] = await db.query(
        `
        SELECT *
        FROM events
        WHERE id = ?
        AND deleted_at IS NULL
        `,
        [eventId]
    );

    if (events.length === 0) {
        return {
            allowed: false,
            status: 404,
            message: "Không tìm thấy sự kiện"
        };
    }

    const event = events[0];

    // Admin xem/gửi tất cả
    if (user.role === "admin") {
        return {
            allowed: true,
            event
        };
    }

    // Leader của event được xem/gửi
    if (Number(user.id) === Number(event.leader_id)) {
        return {
            allowed: true,
            event
        };
    }

    // Employee không được nhắn trong event Nháp
    if (event.status === "Nháp") {
        return {
            allowed: false,
            status: 403,
            message: "Bạn không có quyền nhắn tin trong sự kiện này"
        };
    }

    // Kiểm tra user có thuộc event không
    const [members] = await db.query(
        `
        SELECT id
        FROM event_members
        WHERE event_id = ?
        AND user_id = ?
        `,
        [eventId, user.id]
    );

    if (members.length === 0) {
        return {
            allowed: false,
            status: 403,
            message: "Bạn không thuộc sự kiện này"
        };
    }

    return {
        allowed: true,
        event
    };

};

// Gửi tin nhắn
const sendMessage = async (req, res) => {

    try {

        const {
            event_id,
            content
        } = req.body;

        if (!event_id || !content || content.trim() === "") {
            return res.status(400).json({
                message: "Vui lòng nhập nội dung tin nhắn"
            });
        }

        const access = await checkEventAccess(event_id, req.user);

        if (!access.allowed) {
            return res.status(access.status).json({
                message: access.message
            });
        }

        const event = access.event;

        // Không cho gửi tin nhắn khi event đã kết thúc hoặc đã hủy
        if (
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            return res.status(400).json({
                message: "Không thể gửi tin nhắn trong sự kiện đã kết thúc hoặc đã hủy"
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO messages
            (
                event_id,
                sender_id,
                content
            )
            VALUES (?, ?, ?)
            `,
            [
                event_id,
                req.user.id,
                content.trim()
            ]
        );

        // Tạo notification cho Leader và thành viên khác
        const receivers = new Set();

        if (event.leader_id && Number(event.leader_id) !== Number(req.user.id)) {
            receivers.add(event.leader_id);
        }

        const [members] = await db.query(
            `
            SELECT user_id
            FROM event_members
            WHERE event_id = ?
            AND user_id <> ?
            `,
            [
                event_id,
                req.user.id
            ]
        );

        for (const member of members) {
            receivers.add(member.user_id);
        }

        for (const userId of receivers) {
            await createNotification({
                user_id: userId,
                title: "Tin nhắn mới trong sự kiện",
                content: `${req.user.full_name} đã gửi tin nhắn trong sự kiện "${event.title}"`,
                type: "message",
                related_id: result.insertId
            });
        }

        res.status(201).json({
            message: "Gửi tin nhắn thành công",
            data: {
                id: result.insertId,
                event_id,
                sender_id: req.user.id,
                sender_name: req.user.full_name,
                content: content.trim()
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

// Lấy danh sách tin nhắn theo event
const getMessagesByEvent = async (req, res) => {

    try {

        const { eventId } = req.params;

        const access = await checkEventAccess(eventId, req.user);

        if (!access.allowed) {
            return res.status(access.status).json({
                message: access.message
            });
        }

        const [messages] = await db.query(
            `
            SELECT
                m.id,
                m.event_id,
                m.sender_id,
                u.full_name AS sender_name,
                u.email AS sender_email,
                m.content,
                m.created_at,
                m.updated_at

            FROM messages m

            INNER JOIN users u
                ON m.sender_id = u.id

            WHERE m.event_id = ?
            AND m.is_deleted = FALSE

            ORDER BY m.created_at ASC
            `,
            [eventId]
        );

        res.json({
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

// Xóa tin nhắn
const deleteMessage = async (req, res) => {

    try {

        const { id } = req.params;

        const [messages] = await db.query(
            `
            SELECT
                m.*,
                e.leader_id
            FROM messages m

            INNER JOIN events e
                ON m.event_id = e.id

            WHERE m.id = ?
            AND m.is_deleted = FALSE
            `,
            [id]
        );

        if (messages.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy tin nhắn"
            });
        }

        const message = messages[0];

        // Chỉ Admin, Leader hoặc người gửi được xóa tin nhắn
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(message.leader_id) &&
            Number(req.user.id) !== Number(message.sender_id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa tin nhắn này"
            });
        }

        await db.query(
            `
            UPDATE messages
            SET
                is_deleted = TRUE,
                deleted_at = NOW()
            WHERE id = ?
            `,
            [id]
        );

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
    sendMessage,
    getMessagesByEvent,
    deleteMessage
};