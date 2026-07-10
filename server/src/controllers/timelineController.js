const db = require("../config/db");
const handleServerError = require("../utils/handleServerError");

const VALID_PHASES = [
    "preparation",
    "during_event",
    "post_event"
];

/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ kiểm tra ID
|--------------------------------------------------------------------------
*/
const isValidId = (id) => {
    return (
        Number.isInteger(Number(id)) &&
        Number(id) > 0
    );
};

/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ lấy sự kiện
|--------------------------------------------------------------------------
*/
const getEventById = async (eventId) => {
    const [events] = await db.query(
        `
        SELECT
            id,
            title,
            status,
            leader_id,
            deleted_at
        FROM events
        WHERE id = ?
        AND deleted_at IS NULL
        LIMIT 1
        `,
        [Number(eventId)]
    );

    return events.length > 0
        ? events[0]
        : null;
};

/*
|--------------------------------------------------------------------------
| Hàm hỗ trợ lấy timeline và sự kiện
|--------------------------------------------------------------------------
*/
const getTimelineContext = async (timelineId) => {
    const [timelines] = await db.query(
        `
        SELECT
            et.id,
            et.event_id,
            et.title,
            et.description,
            et.created_by,
            et.created_at,
            et.updated_at,

            e.title AS event_title,
            e.status AS event_status,
            e.leader_id

        FROM event_timelines et

        INNER JOIN events e
            ON et.event_id = e.id

        WHERE et.id = ?
        AND e.deleted_at IS NULL

        LIMIT 1
        `,
        [Number(timelineId)]
    );

    return timelines.length > 0
        ? timelines[0]
        : null;
};

/*
|--------------------------------------------------------------------------
| Kiểm tra quyền quản lý timeline
|--------------------------------------------------------------------------
*/
const canManageTimeline = (req, event) => {
    const isAdmin =
        req.user.role === "admin";

    const isLeader =
        Number(req.user.id) === Number(event.leader_id);

    return isAdmin || isLeader;
};

/*
|--------------------------------------------------------------------------
| Tạo timeline cho sự kiện
|--------------------------------------------------------------------------
*/
const createTimeline = async (req, res) => {
    try {
        const { eventId } = req.params;

        const {
            title,
            description
        } = req.body;

        if (!isValidId(eventId)) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Tiêu đề timeline không được để trống"
            });
        }

        const event = await getEventById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const isAdmin =
            req.user.role === "admin";

        const isLeader =
            Number(req.user.id) === Number(event.leader_id);

        if (!isAdmin && !isLeader) {
            return res.status(403).json({
                message: "Bạn không có quyền tạo timeline cho sự kiện này"
            });
        }

        // Leader chưa được quản lý sự kiện Nháp
        if (!isAdmin && event.status === "Nháp") {
            return res.status(403).json({
                message: "Leader không thể tạo timeline khi sự kiện đang ở trạng thái Nháp"
            });
        }

        // Kiểm tra sự kiện đã có timeline chưa
        const [existingTimelines] = await db.query(
            `
            SELECT id
            FROM event_timelines
            WHERE event_id = ?
            LIMIT 1
            `,
            [Number(eventId)]
        );

        if (existingTimelines.length > 0) {
            return res.status(400).json({
                message: "Sự kiện này đã có timeline"
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO event_timelines (
                event_id,
                title,
                description,
                created_by
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                Number(eventId),
                title.trim(),
                description?.trim() || null,
                req.user.id
            ]
        );

        return res.status(201).json({
            message: "Tạo timeline thành công",
            timeline: {
                id: result.insertId,
                event_id: Number(eventId),
                title: title.trim(),
                description: description?.trim() || null,
                created_by: req.user.id
            }
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xem timeline của sự kiện
|--------------------------------------------------------------------------
*/
const getEventTimeline = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!isValidId(eventId)) {
            return res.status(400).json({
                message: "Mã sự kiện không hợp lệ"
            });
        }

        const event = await getEventById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Không tìm thấy sự kiện"
            });
        }

        const isAdmin =
            req.user.role === "admin";

        const isLeader =
            Number(req.user.id) === Number(event.leader_id);

        // Sự kiện Nháp chỉ Admin được xem
        if (!isAdmin && event.status === "Nháp") {
            return res.status(403).json({
                message: "Bạn không có quyền xem timeline của sự kiện Nháp"
            });
        }

        // Employee phải là thành viên sự kiện
        if (!isAdmin && !isLeader) {
            const [members] = await db.query(
                `
                SELECT user_id
                FROM event_members
                WHERE event_id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [
                    Number(eventId),
                    req.user.id
                ]
            );

            if (members.length === 0) {
                return res.status(403).json({
                    message: "Bạn không có quyền xem timeline của sự kiện này"
                });
            }
        }

        const [timelines] = await db.query(
            `
            SELECT
                et.id,
                et.event_id,
                et.title,
                et.description,
                et.created_by,
                et.created_at,
                et.updated_at,

                e.title AS event_title,
                e.status AS event_status,

                u.full_name AS created_by_name

            FROM event_timelines et

            INNER JOIN events e
                ON et.event_id = e.id

            INNER JOIN users u
                ON et.created_by = u.id

            WHERE et.event_id = ?
            AND e.deleted_at IS NULL

            LIMIT 1
            `,
            [Number(eventId)]
        );

        if (timelines.length === 0) {
            return res.status(404).json({
                message: "Sự kiện chưa có timeline"
            });
        }

        const timeline = timelines[0];

        const [items] = await db.query(
            `
            SELECT
                ti.id,
                ti.timeline_id,
                ti.task_id,
                ti.title,
                ti.description,
                ti.phase,
                ti.start_time,
                ti.end_time,
                ti.order_number,
                ti.created_at,
                ti.updated_at,

                t.title AS task_title,
                t.status AS task_status,
                t.priority AS task_priority,
                t.task_type,
                t.assigned_to,

                assigned_user.full_name AS assigned_name

            FROM timeline_items ti

            LEFT JOIN tasks t
                ON ti.task_id = t.id
                AND t.is_deleted = FALSE

            LEFT JOIN users assigned_user
                ON t.assigned_to = assigned_user.id

            WHERE ti.timeline_id = ?

            ORDER BY
                ti.start_time ASC,
                ti.order_number ASC,
                ti.id ASC
            `,
            [timeline.id]
        );

        return res.status(200).json({
            timeline,
            total_items: items.length,
            items
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Cập nhật thông tin timeline
|--------------------------------------------------------------------------
*/
const updateTimeline = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description
        } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Mã timeline không hợp lệ"
            });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Tiêu đề timeline không được để trống"
            });
        }

        const timeline = await getTimelineContext(id);

        if (!timeline) {
            return res.status(404).json({
                message: "Không tìm thấy timeline"
            });
        }

        if (!canManageTimeline(req, timeline)) {
            return res.status(403).json({
                message: "Bạn không có quyền cập nhật timeline này"
            });
        }

        if (
            req.user.role !== "admin" &&
            timeline.event_status === "Nháp"
        ) {
            return res.status(403).json({
                message: "Leader không thể cập nhật timeline của sự kiện Nháp"
            });
        }

        await db.query(
            `
            UPDATE event_timelines
            SET
                title = ?,
                description = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                title.trim(),
                description?.trim() || null,
                Number(id)
            ]
        );

        return res.status(200).json({
            message: "Cập nhật timeline thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xóa timeline
|--------------------------------------------------------------------------
*/
const deleteTimeline = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Mã timeline không hợp lệ"
            });
        }

        const timeline = await getTimelineContext(id);

        if (!timeline) {
            return res.status(404).json({
                message: "Không tìm thấy timeline"
            });
        }

        if (!canManageTimeline(req, timeline)) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa timeline này"
            });
        }

        if (
            req.user.role !== "admin" &&
            timeline.event_status === "Nháp"
        ) {
            return res.status(403).json({
                message: "Leader không thể xóa timeline của sự kiện Nháp"
            });
        }

        /*
         * timeline_items tự động bị xóa
         * do ON DELETE CASCADE.
         */
        await db.query(
            `
            DELETE FROM event_timelines
            WHERE id = ?
            `,
            [Number(id)]
        );

        return res.status(200).json({
            message: "Xóa timeline thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Thêm mốc vào timeline
|--------------------------------------------------------------------------
*/
const addTimelineItem = async (req, res) => {
    try {
        const { timelineId } = req.params;

        const {
            task_id,
            title,
            description,
            phase,
            start_time,
            end_time,
            order_number
        } = req.body;

        if (!isValidId(timelineId)) {
            return res.status(400).json({
                message: "Mã timeline không hợp lệ"
            });
        }

        if (!start_time || !end_time) {
            return res.status(400).json({
                message: "Vui lòng nhập thời gian bắt đầu và kết thúc"
            });
        }

        const startDate = new Date(start_time);
        const endDate = new Date(end_time);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime())
        ) {
            return res.status(400).json({
                message: "Thời gian timeline không hợp lệ"
            });
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc"
            });
        }

        if (
            order_number !== undefined &&
            (
                !Number.isInteger(Number(order_number)) ||
                Number(order_number) < 0
            )
        ) {
            return res.status(400).json({
                message: "Thứ tự timeline không hợp lệ"
            });
        }

        const timeline = await getTimelineContext(timelineId);

        if (!timeline) {
            return res.status(404).json({
                message: "Không tìm thấy timeline"
            });
        }

        if (!canManageTimeline(req, timeline)) {
            return res.status(403).json({
                message: "Bạn không có quyền thêm mốc timeline"
            });
        }

        if (
            req.user.role !== "admin" &&
            timeline.event_status === "Nháp"
        ) {
            return res.status(403).json({
                message: "Leader không thể thêm timeline khi sự kiện đang ở trạng thái Nháp"
            });
        }

        let linkedTask = null;

        // Kiểm tra task được liên kết
        if (task_id) {
            if (!isValidId(task_id)) {
                return res.status(400).json({
                    message: "Mã công việc không hợp lệ"
                });
            }

            const [tasks] = await db.query(
                `
                SELECT
                    id,
                    event_id,
                    title,
                    description,
                    task_type,
                    status
                FROM tasks
                WHERE id = ?
                AND event_id = ?
                AND is_deleted = FALSE
                LIMIT 1
                `,
                [
                    Number(task_id),
                    timeline.event_id
                ]
            );

            if (tasks.length === 0) {
                return res.status(400).json({
                    message: "Công việc không tồn tại hoặc không thuộc sự kiện này"
                });
            }

            linkedTask = tasks[0];
        }

        const itemTitle =
            title?.trim() ||
            linkedTask?.title;

        if (!itemTitle) {
            return res.status(400).json({
                message: "Tiêu đề mốc timeline không được để trống"
            });
        }

        const itemPhase =
            phase ||
            linkedTask?.task_type;

        if (
            !itemPhase ||
            !VALID_PHASES.includes(itemPhase)
        ) {
            return res.status(400).json({
                message: "Giai đoạn timeline không hợp lệ"
            });
        }

        // Nếu có liên kết task thì phase phải giống task_type
        if (
            linkedTask &&
            itemPhase !== linkedTask.task_type
        ) {
            return res.status(400).json({
                message: "Giai đoạn timeline phải giống loại của công việc được liên kết"
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO timeline_items (
                timeline_id,
                task_id,
                title,
                description,
                phase,
                start_time,
                end_time,
                order_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                Number(timelineId),
                linkedTask ? linkedTask.id : null,
                itemTitle,
                description?.trim() ||
                    linkedTask?.description ||
                    null,
                itemPhase,
                start_time,
                end_time,
                Number(order_number) || 0
            ]
        );

        return res.status(201).json({
            message: "Thêm mốc timeline thành công",
            item: {
                id: result.insertId,
                timeline_id: Number(timelineId),
                task_id: linkedTask
                    ? linkedTask.id
                    : null,
                title: itemTitle,
                phase: itemPhase,
                start_time,
                end_time,
                order_number: Number(order_number) || 0
            }
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Cập nhật mốc timeline
|--------------------------------------------------------------------------
*/
const updateTimelineItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const {
            task_id,
            title,
            description,
            phase,
            start_time,
            end_time,
            order_number
        } = req.body;

        if (!isValidId(itemId)) {
            return res.status(400).json({
                message: "Mã mốc timeline không hợp lệ"
            });
        }

        const [items] = await db.query(
            `
            SELECT
                ti.*,

                et.event_id,

                e.status AS event_status,
                e.leader_id

            FROM timeline_items ti

            INNER JOIN event_timelines et
                ON ti.timeline_id = et.id

            INNER JOIN events e
                ON et.event_id = e.id

            WHERE ti.id = ?
            AND e.deleted_at IS NULL

            LIMIT 1
            `,
            [Number(itemId)]
        );

        if (items.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy mốc timeline"
            });
        }

        const item = items[0];

        if (!canManageTimeline(req, item)) {
            return res.status(403).json({
                message: "Bạn không có quyền cập nhật mốc timeline này"
            });
        }

        if (
            req.user.role !== "admin" &&
            item.event_status === "Nháp"
        ) {
            return res.status(403).json({
                message: "Leader không thể cập nhật timeline của sự kiện Nháp"
            });
        }

        let newTaskId;

        if (task_id === undefined) {
            newTaskId = item.task_id;
        } else if (
            task_id === null ||
            task_id === ""
        ) {
            newTaskId = null;
        } else {
            if (!isValidId(task_id)) {
                return res.status(400).json({
                    message: "Mã công việc không hợp lệ"
                });
            }

            newTaskId = Number(task_id);
        }

        let linkedTask = null;

        if (newTaskId) {
            const [tasks] = await db.query(
                `
                SELECT
                    id,
                    event_id,
                    title,
                    description,
                    task_type
                FROM tasks
                WHERE id = ?
                AND event_id = ?
                AND is_deleted = FALSE
                LIMIT 1
                `,
                [
                    newTaskId,
                    item.event_id
                ]
            );

            if (tasks.length === 0) {
                return res.status(400).json({
                    message: "Công việc không tồn tại hoặc không thuộc sự kiện này"
                });
            }

            linkedTask = tasks[0];
        }

        const newTitle =
            title === undefined
                ? item.title
                : title.trim();

        if (!newTitle) {
            return res.status(400).json({
                message: "Tiêu đề mốc timeline không được để trống"
            });
        }

        let newPhase =
            phase === undefined
                ? item.phase
                : phase;

        // Khi đổi sang task khác và không gửi phase
        if (
            task_id !== undefined &&
            linkedTask &&
            phase === undefined
        ) {
            newPhase = linkedTask.task_type;
        }

        if (!VALID_PHASES.includes(newPhase)) {
            return res.status(400).json({
                message: "Giai đoạn timeline không hợp lệ"
            });
        }

        if (
            linkedTask &&
            newPhase !== linkedTask.task_type
        ) {
            return res.status(400).json({
                message: "Giai đoạn timeline phải giống loại của công việc được liên kết"
            });
        }

        const newStartTime =
            start_time === undefined
                ? item.start_time
                : start_time;

        const newEndTime =
            end_time === undefined
                ? item.end_time
                : end_time;

        const startDate = new Date(newStartTime);
        const endDate = new Date(newEndTime);

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime())
        ) {
            return res.status(400).json({
                message: "Thời gian timeline không hợp lệ"
            });
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc"
            });
        }

        const newOrderNumber =
            order_number === undefined
                ? item.order_number
                : Number(order_number);

        if (
            !Number.isInteger(newOrderNumber) ||
            newOrderNumber < 0
        ) {
            return res.status(400).json({
                message: "Thứ tự timeline không hợp lệ"
            });
        }

        const newDescription =
            description === undefined
                ? item.description
                : description?.trim() || null;

        await db.query(
            `
            UPDATE timeline_items
            SET
                task_id = ?,
                title = ?,
                description = ?,
                phase = ?,
                start_time = ?,
                end_time = ?,
                order_number = ?,
                updated_at = NOW()
            WHERE id = ?
            `,
            [
                newTaskId,
                newTitle,
                newDescription,
                newPhase,
                newStartTime,
                newEndTime,
                newOrderNumber,
                Number(itemId)
            ]
        );

        return res.status(200).json({
            message: "Cập nhật mốc timeline thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xóa mốc timeline
|--------------------------------------------------------------------------
*/
const deleteTimelineItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        if (!isValidId(itemId)) {
            return res.status(400).json({
                message: "Mã mốc timeline không hợp lệ"
            });
        }

        const [items] = await db.query(
            `
            SELECT
                ti.id,
                ti.title,

                e.status AS event_status,
                e.leader_id

            FROM timeline_items ti

            INNER JOIN event_timelines et
                ON ti.timeline_id = et.id

            INNER JOIN events e
                ON et.event_id = e.id

            WHERE ti.id = ?
            AND e.deleted_at IS NULL

            LIMIT 1
            `,
            [Number(itemId)]
        );

        if (items.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy mốc timeline"
            });
        }

        const item = items[0];

        if (!canManageTimeline(req, item)) {
            return res.status(403).json({
                message: "Bạn không có quyền xóa mốc timeline này"
            });
        }

        if (
            req.user.role !== "admin" &&
            item.event_status === "Nháp"
        ) {
            return res.status(403).json({
                message: "Leader không thể xóa timeline của sự kiện Nháp"
            });
        }

        await db.query(
            `
            DELETE FROM timeline_items
            WHERE id = ?
            `,
            [Number(itemId)]
        );

        return res.status(200).json({
            message: "Xóa mốc timeline thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Sắp xếp lại các mốc
|--------------------------------------------------------------------------
*/
const reorderTimelineItems = async (req, res) => {
    let connection;

    try {
        const { timelineId } = req.params;
        const { items } = req.body;

        if (!isValidId(timelineId)) {
            return res.status(400).json({
                message: "Mã timeline không hợp lệ"
            });
        }

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message: "Danh sách sắp xếp không hợp lệ"
            });
        }

        for (const item of items) {
            if (
                !isValidId(item.id) ||
                !Number.isInteger(Number(item.order_number)) ||
                Number(item.order_number) < 0
            ) {
                return res.status(400).json({
                    message: "Dữ liệu sắp xếp timeline không hợp lệ"
                });
            }
        }

        const timeline = await getTimelineContext(timelineId);

        if (!timeline) {
            return res.status(404).json({
                message: "Không tìm thấy timeline"
            });
        }

        if (!canManageTimeline(req, timeline)) {
            return res.status(403).json({
                message: "Bạn không có quyền sắp xếp timeline này"
            });
        }

        const ids = items.map(item => Number(item.id));

        const placeholders = ids
            .map(() => "?")
            .join(", ");

        const [existingItems] = await db.query(
            `
            SELECT id
            FROM timeline_items
            WHERE timeline_id = ?
            AND id IN (${placeholders})
            `,
            [
                Number(timelineId),
                ...ids
            ]
        );

        if (existingItems.length !== ids.length) {
            return res.status(400).json({
                message: "Có mốc không thuộc timeline này"
            });
        }

        connection = await db.getConnection();

        await connection.beginTransaction();

        for (const item of items) {
            await connection.query(
                `
                UPDATE timeline_items
                SET
                    order_number = ?,
                    updated_at = NOW()
                WHERE id = ?
                AND timeline_id = ?
                `,
                [
                    Number(item.order_number),
                    Number(item.id),
                    Number(timelineId)
                ]
            );
        }

        await connection.commit();

        return res.status(200).json({
            message: "Sắp xếp timeline thành công"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        return handleServerError(res, error);

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    createTimeline,
    getEventTimeline,
    updateTimeline,
    deleteTimeline,
    addTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    reorderTimelineItems
};