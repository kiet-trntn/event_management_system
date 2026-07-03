const db = require("../config/db");
const createNotification = require("../utils/createNotification");

const getEventMembers = async (req, res) => {

    try {

        const { eventId } = req.params;

        const {
            search,
            role_in_event,
            status
        } = req.query;

        // Kiểm tra role_in_event hợp lệ
        if (
            role_in_event &&
            role_in_event !== "member" &&
            role_in_event !== "coordinator"
        ) {
            return res.status(400).json({
                message: "Vai trò trong sự kiện không hợp lệ"
            });
        }

        // Kiểm tra status hợp lệ
        if (
            status &&
            status !== "active" &&
            status !== "inactive"
        ) {
            return res.status(400).json({
                message: "Trạng thái tài khoản không hợp lệ"
            });
        }

        // Kiểm tra event tồn tại
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
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Phân quyền xem danh sách thành viên
        // Admin xem được tất cả
        if (req.user.role !== "admin") {

            const isLeader =
                Number(req.user.id) === Number(event.leader_id);

            const [memberCheck] = await db.query(
                `
                SELECT id
                FROM event_members
                WHERE event_id = ?
                AND user_id = ?
                `,
                [eventId, req.user.id]
            );

            const isMember = memberCheck.length > 0;

            if (!isLeader && !isMember) {
                return res.status(403).json({
                    message: "Bạn không có quyền xem danh sách thành viên sự kiện này"
                });
            }

            // Employee không được xem member của event Nháp
            // Trừ khi người đó là Leader
            if (event.status === "Nháp" && !isLeader) {
                return res.status(403).json({
                    message: "Bạn không có quyền xem danh sách thành viên sự kiện này"
                });
            }

        }

        let sql = `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.status,
                em.role_in_event,
                em.joined_at

            FROM event_members em

            INNER JOIN users u
                ON em.user_id = u.id

            WHERE em.event_id = ?
        `;

        let params = [eventId];

        // Tìm kiếm theo tên hoặc email
        if (search) {
            sql += `
                AND (
                    u.full_name LIKE ?
                    OR u.email LIKE ?
                )
            `;

            params.push(
                `%${search}%`,
                `%${search}%`
            );
        }

        // Lọc theo vai trò trong sự kiện
        if (role_in_event) {
            sql += `
                AND em.role_in_event = ?
            `;

            params.push(role_in_event);
        }

        // Lọc theo trạng thái tài khoản
        if (status) {
            sql += `
                AND u.status = ?
            `;

            params.push(status);
        }

        sql += `
            ORDER BY em.id DESC
        `;

        const [members] = await db.query(sql, params);

        res.json({
            event_id: Number(eventId),
            total_members: members.length,
            members
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const addMemberToEvent = async (req, res) => {

    try {

        const { eventId } = req.params;

        const {
            user_id,
            role_in_event
        } = req.body;

        // Kiểm tra rỗng
        if (!user_id) {
            return res.status(400).json({
                message: "Vui lòng chọn thành viên"
            });
        }

        // Kiểm tra role
        if (
            role_in_event &&
            role_in_event !== "member" &&
            role_in_event !== "coordinator"
        ) {
            return res.status(400).json({
                message: "Vai trò không hợp lệ"
            });
        }

        // Kiểm tra event tồn tại
        const [events] = await db.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            `,
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

         if (req.user.role !== "admin" && req.user.id !== event.leader_id) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện hành động này trong sự kiện"
            });
        }
        

        // Kiểm tra user tồn tại
        const [users] = await db.query(
            `
            SELECT *
            FROM users
            WHERE id = ?
            `,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thành viên"
            });
        }

        const user = users[0];

        // Tài khoản bị khóa
        if (user.status === "inactive") {
            return res.status(400).json({
                message: "Tài khoản đã bị khóa"
            });
        }

        // Không thêm leader
        if (event.leader_id === user.id) {
            return res.status(400).json({
                message: "Người này đang là leader của sự kiện"
            });
        }

        // Kiểm tra trùng
        const [exists] = await db.query(
            `
            SELECT *
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [eventId, user_id]
        );

        if (exists.length > 0) {
            return res.status(400).json({
                message: "Thành viên đã tham gia sự kiện"
            });
        }

        // Đếm số thành viên hiện tại
        const [memberCount] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM event_members
            WHERE event_id = ?
            `,
            [eventId]
        );

        if (
            memberCount[0].total >= event.max_members
        ) {
            return res.status(400).json({
                message: "Sự kiện đã đủ số lượng thành viên"
            });
        }

        // Thêm thành viên
        await db.query(
            `
            INSERT INTO event_members (
                event_id,
                user_id,
                role_in_event
            )
            VALUES (?, ?, ?)
            `,
            [
                eventId,
                user_id,
                role_in_event || "member"
            ]
        );

        await createNotification({
            user_id: user_id,
            title: "Bạn được thêm vào sự kiện",
            content: `Bạn đã được thêm vào sự kiện "${event.title}"`,
            type: "event",
            related_id: eventId
        });

        res.status(201).json({
            message: "Thêm thành viên thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const removeMemberFromEvent = async (req, res) => {

    try {

        const {
            eventId,
            userId
        } = req.params;

        // Kiểm tra event tồn tại
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
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Không cho xóa Leader khỏi sự kiện bằng chức năng xóa thành viên
        if (Number(userId) === Number(event.leader_id)) {
            return res.status(400).json({
                message: "Không thể xóa Leader của sự kiện. Vui lòng đổi Leader trước"
            });
        }

        // Kiểm tra thành viên trong event
        const [members] = await db.query(
            `
            SELECT *
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [eventId, userId]
        );

        if (members.length === 0) {
            return res.status(404).json({
                message: "Thành viên không thuộc sự kiện này"
            });
        }

        // Chỉ Admin hoặc Leader được xóa thành viên
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(event.leader_id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện hành động này trong sự kiện"
            });
        }

        if (
            event.status === "Đang diễn ra" ||
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            return res.status(400).json({
                message: "Không thể thay đổi thành viên của sự kiện này"
            });
        }

        // Lấy danh sách công việc đang giao cho thành viên bị xóa
        // Phải lấy trước khi SET assigned_to = NULL
        const [assignedTasks] = await db.query(
            `
            SELECT
                id,
                title,
                created_by
            FROM tasks
            WHERE event_id = ?
            AND assigned_to = ?
            AND is_deleted = FALSE
            `,
            [eventId, userId]
        );

        // Bỏ giao các công việc của thành viên bị xóa
        await db.query(
            `
            UPDATE tasks
            SET
                assigned_to = NULL,
                updated_at = NOW()
            WHERE event_id = ?
            AND assigned_to = ?
            `,
            [eventId, userId]
        );

        // Xóa thành viên khỏi sự kiện
        await db.query(
            `
            DELETE FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [eventId, userId]
        );

        // Thông báo cho thành viên bị xóa
        await createNotification({
            user_id: userId,
            title: "Bạn đã bị xóa khỏi sự kiện",
            content: `Bạn đã bị xóa khỏi sự kiện "${event.title}"`,
            type: "event",
            related_id: eventId
        });

        // Nếu thành viên đó đang có công việc thì thông báo cho Leader/người tạo task
        if (assignedTasks.length > 0) {

            const taskNames = assignedTasks
                .slice(0, 5)
                .map(task => `"${task.title}"`)
                .join(", ");

            const moreText =
                assignedTasks.length > 5
                    ? ` và ${assignedTasks.length - 5} công việc khác`
                    : "";

            const receivers = new Set();

            // Leader sự kiện cần biết để phân công lại
            if (event.leader_id) {
                receivers.add(Number(event.leader_id));
            }

            // Người tạo task cũng nên biết
            for (const task of assignedTasks) {
                if (task.created_by) {
                    receivers.add(Number(task.created_by));
                }
            }

            // Không gửi cho người bị xóa
            receivers.delete(Number(userId));

            for (const receiverId of receivers) {
                await createNotification({
                    user_id: receiverId,
                    title: "Cần phân công lại công việc",
                    content: `Thành viên bị xóa khỏi sự kiện "${event.title}" đang phụ trách ${assignedTasks.length} công việc: ${taskNames}${moreText}. Vui lòng phân công lại.`,
                    type: "task",
                    related_id: eventId
                });
            }

        }

        res.json({
            message: "Xóa thành viên khỏi sự kiện thành công",
            unassigned_task_count: assignedTasks.length,
            need_reassign: assignedTasks.length > 0
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

const updateMemberRole = async (req, res) => {

    try {

        const {
            eventId,
            userId
        } = req.params;

        const {
            role_in_event
        } = req.body;

        // Kiểm tra role
        if (
            role_in_event !== "member" &&
            role_in_event !== "coordinator"
        ) {
            return res.status(400).json({
                message: "Vai trò không hợp lệ"
            });
        }

        // Kiểm tra event tồn tại
        const [events] = await db.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            `,
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        if (req.user.role !== "admin" && req.user.id !== event.leader_id) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện hành động này trong sự kiện"
            });
        }

        // Không cho sửa khi event đã khóa
        if (
            event.status === "Đang diễn ra" ||
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            return res.status(400).json({
                message: "Không thể cập nhật vai trò"
            });
        }

        // Kiểm tra thành viên thuộc event
        const [members] = await db.query(
            `
            SELECT *
            FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [eventId, userId]
        );

        if (members.length === 0) {
            return res.status(404).json({
                message: "Thành viên không thuộc sự kiện"
            });
        }

        // Cập nhật role
        await db.query(
            `
            UPDATE event_members
            SET role_in_event = ?
            WHERE event_id = ?
            AND user_id = ?
            `,
            [
                role_in_event,
                eventId,
                userId
            ]
        );

        res.json({
            message: "Cập nhật vai trò thành công"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    getEventMembers,
    addMemberToEvent,
    removeMemberFromEvent,
    updateMemberRole
};