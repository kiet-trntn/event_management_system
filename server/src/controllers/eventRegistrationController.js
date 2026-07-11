const db = require("../config/db");
const handleServerError = require("../utils/handleServerError");
const createNotification = require("../utils/createNotification");
const { emitToUser } = require("../socket/socket");

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidId = (id) => {
    return (
        Number.isInteger(Number(id)) &&
        Number(id) > 0
    );
};

const canManageEvent = (req, event) => {
    const isAdmin =
        req.user.role === "admin";

    const isLeader =
        Number(req.user.id) === Number(event.leader_id);

    return isAdmin || isLeader;
};

/*
|--------------------------------------------------------------------------
| Lấy thông tin sự kiện công khai
|--------------------------------------------------------------------------
| Không cần đăng nhập.
*/
const getPublicEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!isValidId(eventId)) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        const [events] = await db.query(
            `
            SELECT
                e.id,
                e.title,
                e.description,
                e.location,
                e.start_date,
                e.end_date,
                e.status,
                e.max_attendees,
                e.registration_deadline,

                (
                    SELECT COUNT(*)
                    FROM event_registrations er
                    WHERE er.event_id = e.id
                    AND er.status = 'confirmed'
                ) AS registered_count

            FROM events e

            WHERE e.id = ?
            AND e.deleted_at IS NULL

            LIMIT 1
            `,
            [Number(eventId)]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        // Chỉ sự kiện đã công bố mới được hiển thị công khai
        if (event.status !== "Sắp diễn ra") {
            return res.status(403).json({
                message: "Sự kiện hiện không mở đăng ký"
            });
        }

        const registrationClosed =
            event.registration_deadline &&
            new Date() > new Date(event.registration_deadline);

        const isFull =
            event.max_attendees &&
            Number(event.registered_count) >=
                Number(event.max_attendees);

        return res.status(200).json({
            event: {
                ...event,
                remaining_slots: event.max_attendees
                    ? Math.max(
                        Number(event.max_attendees) -
                            Number(event.registered_count),
                        0
                    )
                    : null,
                registration_closed: Boolean(registrationClosed),
                is_full: Boolean(isFull)
            }
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Khách đăng ký tham dự
|--------------------------------------------------------------------------
| Không cần đăng nhập.
*/
const registerForEvent = async (req, res) => {
    let connection;

    try {
        const { eventId } = req.params;

        const {
            full_name,
            email,
            phone,
            organization,
            note
        } = req.body;

        if (!isValidId(eventId)) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        if (
            !full_name ||
            !full_name.trim() ||
            !email ||
            !email.trim()
        ) {
            return res.status(400).json({
                message: "Vui lòng nhập họ tên và email"
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Email không hợp lệ"
            });
        }

        if (
            phone &&
            !/^[0-9+\-\s]{8,20}$/.test(phone.trim())
        ) {
            return res.status(400).json({
                message: "Số điện thoại không hợp lệ"
            });
        }

        connection = await db.getConnection();

        await connection.beginTransaction();

        /*
         * FOR UPDATE giúp hạn chế nhiều người đăng ký cùng lúc
         * khiến số lượng vượt quá giới hạn.
         */
        const [events] = await connection.query(
            `
            SELECT
                id,
                title,
                status,
                leader_id,
                max_attendees,
                registration_deadline

            FROM events

            WHERE id = ?
            AND deleted_at IS NULL

            LIMIT 1
            FOR UPDATE
            `,
            [Number(eventId)]
        );

        if (events.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        if (event.status !== "Sắp diễn ra") {
            await connection.rollback();

            return res.status(400).json({
                message: "Sự kiện hiện không mở đăng ký"
            });
        }

        if (
            event.registration_deadline &&
            new Date() > new Date(event.registration_deadline)
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "Sự kiện đã hết hạn đăng ký"
            });
        }

        // Kiểm tra email đã đăng ký sự kiện này chưa
        const [existingRegistrations] =
            await connection.query(
                `
                SELECT
                    id,
                    status
                FROM event_registrations
                WHERE event_id = ?
                AND email = ?
                LIMIT 1
                `,
                [
                    Number(eventId),
                    normalizedEmail
                ]
            );

            if (existingRegistrations.length > 0) {
                const existingRegistration = existingRegistrations[0];

                if (existingRegistration.status === "cancelled") {
                    await connection.query(
                        `
                        UPDATE event_registrations
                        SET status = 'confirmed',
                            registered_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        `,
                        [existingRegistration.id]
                    );

                    await connection.commit();

                    return res.status(200).json({
                        message: "Đăng ký lại sự kiện thành công"
                    });
                }

                await connection.rollback();

                return res.status(400).json({
                    message: "Email này đã đăng ký tham dự sự kiện"
                });
            }

        // Đếm số người đang giữ chỗ
        const [countRows] = await connection.query(
            `
            SELECT COUNT(*) AS total
            FROM event_registrations
            WHERE event_id = ?
            AND status = 'confirmed'
            `,
            [Number(eventId)]
        );

        const registeredCount =
            Number(countRows[0].total);

        if (
            event.max_attendees &&
            registeredCount >= Number(event.max_attendees)
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: "Sự kiện đã đủ số lượng người tham dự"
            });
        }

        const [result] = await connection.query(
            `
            INSERT INTO event_registrations (
                event_id,
                full_name,
                email,
                phone,
                organization,
                note,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
            `,
            [
                Number(eventId),
                full_name.trim(),
                normalizedEmail,
                phone?.trim() || null,
                organization?.trim() || null,
                note?.trim() || null
            ]
        );

        await connection.commit();

        const registrationData = {
            id: result.insertId,
            event_id: Number(eventId),
            event_title: event.title,
            full_name: full_name.trim(),
            email: normalizedEmail,
            phone: phone?.trim() || null,
            organization: organization?.trim() || null,
            status: "confirmed",
            registered_at: new Date()
        };

        /*
         * Thông báo cho Leader.
         * Lỗi thông báo không làm đăng ký của khách thất bại.
         */
        if (event.leader_id) {
            try {
                await createNotification({
                    user_id: event.leader_id,
                    title: "Có người đăng ký sự kiện",
                    content:
                        `${full_name.trim()} đã đăng ký tham dự ` +
                        `sự kiện "${event.title}"`,
                    type: "event",
                    related_id: Number(eventId)
                });

                emitToUser(
                    event.leader_id,
                    "new_event_registration",
                    registrationData
                );

            } catch (notificationError) {
                console.error(
                    "Lỗi gửi thông báo đăng ký:",
                    notificationError
                );
            }
        }

        return res.status(201).json({
            message: "Đăng ký tham dự sự kiện thành công",
            registration: registrationData
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        // Trường hợp hai request cùng email gửi gần như đồng thời
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                message: "Email này đã đăng ký tham dự sự kiện"
            });
        }

        return handleServerError(res, error);

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/*
|--------------------------------------------------------------------------
| Admin hoặc Leader xem danh sách người đăng ký
|--------------------------------------------------------------------------
*/
const getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;

        const {
            search,
            status
        } = req.query;

        const validStatuses = [
            "confirmed",
            "cancelled"
        ];

        if (!isValidId(eventId)) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        if (
            status &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Trạng thái đăng ký không hợp lệ"
            });
        }

        const [events] = await db.query(
            `
            SELECT
                id,
                title,
                leader_id
            FROM events
            WHERE id = ?
            AND deleted_at IS NULL
            LIMIT 1
            `,
            [Number(eventId)]
        );

        if (events.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const event = events[0];

        if (!canManageEvent(req, event)) {
            return res.status(403).json({
                message:
                    "Bạn không có quyền xem danh sách người đăng ký"
            });
        }

        let sql = `
            SELECT
                er.id,
                er.event_id,
                er.full_name,
                er.email,
                er.phone,
                er.organization,
                er.note,
                er.status,
                er.registered_at

            FROM event_registrations er

            WHERE er.event_id = ?
        `;

        const params = [
            Number(eventId)
        ];

        if (search && search.trim()) {
            const keyword =
                `%${search.trim()}%`;

            sql += `
                AND (
                    er.full_name LIKE ?
                    OR er.email LIKE ?
                    OR er.phone LIKE ?
                    OR er.organization LIKE ?
                )
            `;

            params.push(
                keyword,
                keyword,
                keyword,
                keyword
            );
        }

        if (status) {
            sql += `
                AND er.status = ?
            `;

            params.push(status);
        }

        sql += `
            ORDER BY er.registered_at DESC
        `;

        const [registrations] =
            await db.query(sql, params);

        const summary = {
            confirmed: 0,
            cancelled: 0
        };

        for (const registration of registrations) {
            if (
                Object.prototype.hasOwnProperty.call(
                    summary,
                    registration.status
                )
            ) {
                summary[registration.status]++;
            }
        }

        return res.status(200).json({
            event: {
                id: event.id,
                title: event.title
            },
            total: registrations.length,
            summary,
            registrations
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Admin hoặc Leader hủy đăng ký của khách
|--------------------------------------------------------------------------
*/
const cancelRegistration = async (req, res) => {
    try {
        const { eventId, registrationId } = req.params;

        if (!isValidId(eventId) || !isValidId(registrationId)) {
            return res.status(400).json({
                message: "Mã không hợp lệ"
            });
        }

        // 1. Kiểm tra sự kiện tồn tại và quyền quản lý (Admin/Leader)
        const [events] = await db.query(
            `SELECT id, leader_id FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
            [Number(eventId)]
        );

        if (events.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện" });
        }

        if (!canManageEvent(req, events[0])) {
            return res.status(403).json({ message: "Bạn không có quyền thao tác sự kiện này" });
        }

        // 2. Tiến hành hủy vé
        const [result] = await db.query(
            `
            UPDATE event_registrations 
            SET status = 'cancelled' 
            WHERE id = ? AND event_id = ? AND status = 'confirmed'
            `,
            [Number(registrationId), Number(eventId)]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                message: "Không thể hủy vé này (có thể vé không tồn tại hoặc đã bị hủy trước đó)" 
            });
        }

        return res.status(200).json({
            message: "Hủy đăng ký thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

module.exports = {
    getPublicEvent,
    registerForEvent,
    getEventRegistrations,
    cancelRegistration
};