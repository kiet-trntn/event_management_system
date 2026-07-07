const db = require("../config/db");
const createNotification = require("../utils/createNotification");
const handleServerError = require("../utils/handleServerError");

const getEventMembers = async (req, res) => {

    try {

        const { eventId } = req.params;

        const {
            search,
            status
        } = req.query;

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

            // Không cho user thường xem thành viên của event Nháp
            if (event.status === "Nháp") {
                return res.status(403).json({
                    message: "Bạn không có quyền xem danh sách thành viên sự kiện này"
                });
            }

        }

        let sql = `
            SELECT
                em.id,
                em.event_id,
                em.user_id,
                u.full_name,
                u.email,
                u.phone,
                u.status,
                em.joined_at AS created_at
            FROM event_members em
            INNER JOIN users u
                ON em.user_id = u.id
            WHERE em.event_id = ?
        `;

        let params = [eventId];

        // Tìm kiếm theo tên, email hoặc số điện thoại
        if (search) {
            sql += `
                AND (
                    u.full_name LIKE ?
                    OR u.email LIKE ?
                    OR u.phone LIKE ?
                )
            `;

            params.push(
                `%${search}%`,
                `%${search}%`,
                `%${search}%`
            );
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

        return handleServerError(res, error);

    }

};

const addMemberToEvent = async (req, res) => {

    try {

        const { eventId } = req.params;

        const { user_id } = req.body;

        // Kiểm tra rỗng
        if (!user_id) {
            return res.status(400).json({
                message: "Vui lòng chọn thành viên"
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

        // Chỉ Admin hoặc Leader được thêm thành viên
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(event.leader_id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện hành động này trong sự kiện"
            });
        }

        // Không cho thay đổi thành viên khi event đã khóa
        if (
            event.status === "Đang diễn ra" ||
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            return res.status(400).json({
                message: "Không thể thay đổi thành viên của sự kiện này"
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

        // Chỉ cho thêm employee
        if (user.role !== "employee") {
            return res.status(400).json({
                message: "Chỉ có thể thêm nhân viên vào sự kiện"
            });
        }

        // Tài khoản bị khóa
        if (user.status === "inactive") {
            return res.status(400).json({
                message: "Tài khoản đã bị khóa"
            });
        }

        // Không thêm leader vào danh sách thành viên
        if (Number(event.leader_id) === Number(user.id)) {
            return res.status(400).json({
                message: "Người này đang là Leader của sự kiện"
            });
        }

        // Kiểm tra trùng
        const [exists] = await db.query(
            `
            SELECT id
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

        // Kiểm tra giới hạn số lượng thành viên nếu có max_members
        if (event.max_members) {

            const [memberCount] = await db.query(
                `
                SELECT COUNT(*) AS total
                FROM event_members
                WHERE event_id = ?
                `,
                [eventId]
            );

            if (memberCount[0].total >= event.max_members) {
                return res.status(400).json({
                    message: "Sự kiện đã đủ số lượng thành viên"
                });
            }

        }

        // Thêm thành viên
        await db.query(
            `
            INSERT INTO event_members
            (
                event_id,
                user_id
            )
            VALUES (?, ?)
            `,
            [
                eventId,
                user_id
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

        return handleServerError(res, error);

    }

};

const removeMemberFromEvent = async (req, res) => {

    let connection;

    try {

        const {
            eventId,
            userId
        } = req.params;

        const {
            confirm
        } = req.query;

        // Lấy connection để dùng transaction
        connection = await db.getConnection();

        // Kiểm tra event tồn tại
        const [events] = await connection.query(
            `
            SELECT *
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            `,
            [eventId]
        );

        if (events.length === 0) {
            connection.release();

            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Không cho xóa Leader
        if (Number(userId) === Number(event.leader_id)) {
            connection.release();

            return res.status(400).json({
                message: "Không thể xóa Leader của sự kiện. Vui lòng đổi Leader trước"
            });
        }

        // Chỉ Admin hoặc Leader được xóa thành viên
        if (
            req.user.role !== "admin" &&
            Number(req.user.id) !== Number(event.leader_id)
        ) {
            connection.release();

            return res.status(403).json({
                message: "Bạn không có quyền thực hiện hành động này trong sự kiện"
            });
        }

        // Không cho thay đổi thành viên khi event đã khóa
        if (
            event.status === "Đang diễn ra" ||
            event.status === "Đã kết thúc" ||
            event.status === "Đã hủy"
        ) {
            connection.release();

            return res.status(400).json({
                message: "Không thể thay đổi thành viên của sự kiện này"
            });
        }

        // Kiểm tra thành viên có thuộc event không
        const [members] = await connection.query(
            `
            SELECT
                em.*,
                u.full_name,
                u.email
            FROM event_members em
            INNER JOIN users u
                ON em.user_id = u.id
            WHERE em.event_id = ?
            AND em.user_id = ?
            `,
            [eventId, userId]
        );

        if (members.length === 0) {
            connection.release();

            return res.status(404).json({
                message: "Thành viên không thuộc sự kiện này"
            });
        }

        const removedMember = members[0];

        // Lấy danh sách công việc đang bị ảnh hưởng
        // Chỉ lấy task chưa hoàn tất / chưa hủy
        const [affectedTasks] = await connection.query(
            `
            SELECT
                id,
                title,
                status,
                created_by
            FROM tasks
            WHERE event_id = ?
            AND assigned_to = ?
            AND is_deleted = FALSE
            AND status NOT IN ('completed', 'cancelled')
            `,
            [eventId, userId]
        );

        // Nếu có task bị ảnh hưởng mà chưa confirm thì trả cảnh báo
        if (
            affectedTasks.length > 0 &&
            confirm !== "true"
        ) {
            connection.release();

            return res.status(409).json({
                message: "Thành viên này đang phụ trách công việc. Cần xác nhận trước khi xóa",
                need_confirm: true,
                affected_task_count: affectedTasks.length,
                affected_tasks: affectedTasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    status: task.status
                }))
            });
        }

        await connection.beginTransaction();

        // Nếu có task bị ảnh hưởng thì bỏ người được giao
        if (affectedTasks.length > 0) {

            const taskIds = affectedTasks.map(task => task.id);
            const placeholders = taskIds.map(() => "?").join(",");

            await connection.query(
                `
                UPDATE tasks
                SET
                    assigned_to = NULL,
                    updated_at = NOW()
                WHERE id IN (${placeholders})
                `,
                taskIds
            );

            // Lưu lịch sử từng task
            for (const task of affectedTasks) {
                await connection.query(
                    `
                    INSERT INTO task_history
                    (
                        task_id,
                        user_id,
                        action,
                        old_value,
                        new_value
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        task.id,
                        req.user.id,
                        "assigned_changed",
                        JSON.stringify({
                            assigned_to: Number(userId),
                            assigned_name: removedMember.full_name
                        }),
                        JSON.stringify({
                            assigned_to: null,
                            reason: "Thành viên bị xóa khỏi sự kiện"
                        })
                    ]
                );
            }

        }

        // Xóa thành viên khỏi sự kiện
        await connection.query(
            `
            DELETE FROM event_members
            WHERE event_id = ?
            AND user_id = ?
            `,
            [eventId, userId]
        );

        await connection.commit();
        connection.release();

        // Thông báo cho thành viên bị xóa
        await createNotification({
            user_id: userId,
            title: "Bạn đã bị xóa khỏi sự kiện",
            content: `Bạn đã bị xóa khỏi sự kiện "${event.title}". Các công việc đang phụ trách trong sự kiện sẽ được Leader/Admin phân công lại.`,
            type: "event",
            related_id: eventId
        });

        // Nếu thành viên đó đang có công việc thì thông báo cho Leader/người tạo task
        if (affectedTasks.length > 0) {

            const taskNames = affectedTasks
                .slice(0, 5)
                .map(task => `"${task.title}"`)
                .join(", ");

            const moreText =
                affectedTasks.length > 5
                    ? ` và ${affectedTasks.length - 5} công việc khác`
                    : "";

            const receivers = new Set();

            // Leader sự kiện cần biết để phân công lại
            if (event.leader_id) {
                receivers.add(Number(event.leader_id));
            }

            // Người tạo task cũng nên biết
            for (const task of affectedTasks) {
                if (task.created_by) {
                    receivers.add(Number(task.created_by));
                }
            }

            // Không gửi lại cho người bị xóa
            receivers.delete(Number(userId));

            for (const receiverId of receivers) {
                await createNotification({
                    user_id: receiverId,
                    title: "Cần phân công lại công việc",
                    content: `Thành viên "${removedMember.full_name}" đã bị xóa khỏi sự kiện "${event.title}" và đang phụ trách ${affectedTasks.length} công việc: ${taskNames}${moreText}. Vui lòng phân công lại.`,
                    type: "task",
                    related_id: eventId
                });
            }

        }

        res.json({
            message: "Xóa thành viên khỏi sự kiện thành công",
            removed_user: {
                id: Number(userId),
                full_name: removedMember.full_name,
                email: removedMember.email
            },
            affected_task_count: affectedTasks.length,
            need_reassign: affectedTasks.length > 0,
            affected_tasks: affectedTasks.map(task => ({
                id: task.id,
                title: task.title,
                status: task.status
            }))
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
            connection.release();
        }

        console.log(error);

        return handleServerError(res, error);

    }

};



module.exports = {
    getEventMembers,
    addMemberToEvent,
    removeMemberFromEvent,

};