const db = require("../config/db");
const handleServerError = require("../utils/handleServerError");

const VALID_FRIENDSHIP_STATUSES = [
    "pending",
    "accepted",
    "rejected"
];

/*
|--------------------------------------------------------------------------
| Gửi lời mời kết bạn
|--------------------------------------------------------------------------
*/
const sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;

        const requesterId = Number(req.user.id);
        const receiverId = Number(userId);

        // Kiểm tra ID người nhận
        if (
            !Number.isInteger(receiverId) ||
            receiverId <= 0
        ) {
            return res.status(400).json({
                message: "Mã người dùng không hợp lệ"
            });
        }

        // Không thể kết bạn với chính mình
        if (requesterId === receiverId) {
            return res.status(400).json({
                message: "Bạn không thể gửi lời mời kết bạn cho chính mình"
            });
        }

        // Kiểm tra người nhận tồn tại và đang hoạt động
        const [users] = await db.query(
            `
            SELECT
                id,
                full_name,
                status
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [receiverId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng"
            });
        }

        const receiver = users[0];

        if (receiver.status !== "active") {
            return res.status(400).json({
                message: "Tài khoản người dùng hiện không hoạt động"
            });
        }

        /*
         * Kiểm tra quan hệ đã tồn tại theo cả hai chiều:
         * A gửi B hoặc B gửi A.
         */
        const [existingFriendships] = await db.query(
            `
            SELECT
                id,
                requester_id,
                receiver_id,
                status
            FROM friendships
            WHERE (
                requester_id = ?
                AND receiver_id = ?
            )
            OR (
                requester_id = ?
                AND receiver_id = ?
            )
            LIMIT 1
            `,
            [
                requesterId,
                receiverId,
                receiverId,
                requesterId
            ]
        );

        if (existingFriendships.length > 0) {
            const friendship = existingFriendships[0];

            // Đã là bạn bè
            if (friendship.status === "accepted") {
                return res.status(400).json({
                    message: "Hai người đã là bạn bè"
                });
            }

            // Đang có lời mời chờ xử lý
            if (friendship.status === "pending") {
                const isCurrentUserRequester =
                    Number(friendship.requester_id) === requesterId;

                if (isCurrentUserRequester) {
                    return res.status(400).json({
                        message: "Bạn đã gửi lời mời kết bạn cho người này"
                    });
                }

                return res.status(400).json({
                    message: "Người này đã gửi lời mời kết bạn cho bạn. Vui lòng kiểm tra danh sách lời mời đã nhận"
                });
            }

            /*
             * Nếu lời mời cũ từng bị từ chối,
             * cập nhật lại bản ghi thành lời mời mới.
             */
            if (friendship.status === "rejected") {
                await db.query(
                    `
                    UPDATE friendships
                    SET
                        requester_id = ?,
                        receiver_id = ?,
                        status = 'pending',
                        updated_at = NOW()
                    WHERE id = ?
                    `,
                    [
                        requesterId,
                        receiverId,
                        friendship.id
                    ]
                );

                return res.status(200).json({
                    message: "Gửi lại lời mời kết bạn thành công",
                    friendship: {
                        id: friendship.id,
                        requester_id: requesterId,
                        receiver_id: receiverId,
                        receiver_name: receiver.full_name,
                        status: "pending"
                    }
                });
            }
        }

        // Tạo lời mời mới
        const [result] = await db.query(
            `
            INSERT INTO friendships (
                requester_id,
                receiver_id,
                status
            )
            VALUES (?, ?, 'pending')
            `,
            [
                requesterId,
                receiverId
            ]
        );

        return res.status(201).json({
            message: "Gửi lời mời kết bạn thành công",
            friendship: {
                id: result.insertId,
                requester_id: requesterId,
                receiver_id: receiverId,
                receiver_name: receiver.full_name,
                status: "pending"
            }
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xem danh sách lời mời đã nhận
|--------------------------------------------------------------------------
*/
const getReceivedFriendRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `
            SELECT
                f.id,
                f.requester_id,
                f.receiver_id,
                f.status,
                f.created_at,
                f.updated_at,

                u.full_name AS requester_name,
                u.email AS requester_email,
                u.status AS requester_status

            FROM friendships f

            INNER JOIN users u
                ON f.requester_id = u.id

            WHERE f.receiver_id = ?
            AND f.status = 'pending'
            AND u.status = 'active'

            ORDER BY f.created_at DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            total: requests.length,
            requests
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xem danh sách lời mời đã gửi
|--------------------------------------------------------------------------
*/
const getSentFriendRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `
            SELECT
                f.id,
                f.requester_id,
                f.receiver_id,
                f.status,
                f.created_at,
                f.updated_at,

                u.full_name AS receiver_name,
                u.email AS receiver_email,
                u.status AS receiver_status

            FROM friendships f

            INNER JOIN users u
                ON f.receiver_id = u.id

            WHERE f.requester_id = ?
            AND f.status = 'pending'

            ORDER BY f.created_at DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            total: requests.length,
            requests
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Chấp nhận lời mời kết bạn
|--------------------------------------------------------------------------
*/
const acceptFriendRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const friendshipId = Number(id);

        if (
            !Number.isInteger(friendshipId) ||
            friendshipId <= 0
        ) {
            return res.status(400).json({
                message: "Mã lời mời kết bạn không hợp lệ"
            });
        }

        const [friendships] = await db.query(
            `
            SELECT
                f.*,
                requester.full_name AS requester_name

            FROM friendships f

            INNER JOIN users requester
                ON f.requester_id = requester.id

            WHERE f.id = ?
            LIMIT 1
            `,
            [friendshipId]
        );

        if (friendships.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy lời mời kết bạn"
            });
        }

        const friendship = friendships[0];

        // Chỉ người nhận mới có quyền chấp nhận
        if (
            Number(friendship.receiver_id) !==
            Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền chấp nhận lời mời này"
            });
        }

        if (friendship.status === "accepted") {
            return res.status(400).json({
                message: "Lời mời kết bạn đã được chấp nhận trước đó"
            });
        }

        if (friendship.status === "rejected") {
            return res.status(400).json({
                message: "Lời mời kết bạn này đã bị từ chối"
            });
        }

        await db.query(
            `
            UPDATE friendships
            SET
                status = 'accepted',
                updated_at = NOW()
            WHERE id = ?
            `,
            [friendshipId]
        );

        return res.status(200).json({
            message: "Chấp nhận lời mời kết bạn thành công",
            friendship: {
                id: friendshipId,
                friend_id: friendship.requester_id,
                friend_name: friendship.requester_name,
                status: "accepted"
            }
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Từ chối lời mời kết bạn
|--------------------------------------------------------------------------
*/
const rejectFriendRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const friendshipId = Number(id);

        if (
            !Number.isInteger(friendshipId) ||
            friendshipId <= 0
        ) {
            return res.status(400).json({
                message: "Mã lời mời kết bạn không hợp lệ"
            });
        }

        const [friendships] = await db.query(
            `
            SELECT *
            FROM friendships
            WHERE id = ?
            LIMIT 1
            `,
            [friendshipId]
        );

        if (friendships.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy lời mời kết bạn"
            });
        }

        const friendship = friendships[0];

        // Chỉ người nhận mới được từ chối
        if (
            Number(friendship.receiver_id) !==
            Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền từ chối lời mời này"
            });
        }

        if (friendship.status === "accepted") {
            return res.status(400).json({
                message: "Hai người đã là bạn bè, không thể từ chối lời mời"
            });
        }

        if (friendship.status === "rejected") {
            return res.status(400).json({
                message: "Lời mời kết bạn đã bị từ chối trước đó"
            });
        }

        await db.query(
            `
            UPDATE friendships
            SET
                status = 'rejected',
                updated_at = NOW()
            WHERE id = ?
            `,
            [friendshipId]
        );

        return res.status(200).json({
            message: "Từ chối lời mời kết bạn thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Xem danh sách bạn bè
|--------------------------------------------------------------------------
*/
const getFriends = async (req, res) => {
    try {
        const { search } = req.query;

        let sql = `
            SELECT
                f.id AS friendship_id,
                f.status AS friendship_status,
                f.created_at AS friendship_created_at,

                u.id AS user_id,
                u.full_name,
                u.email,
                u.role,
                u.status

            FROM friendships f

            INNER JOIN users u
                ON u.id = CASE
                    WHEN f.requester_id = ?
                        THEN f.receiver_id
                    ELSE f.requester_id
                END

            WHERE (
                f.requester_id = ?
                OR f.receiver_id = ?
            )

            AND f.status = 'accepted'
            AND u.status = 'active'
            AND u.id <> ?
        `;

        const params = [
            req.user.id,
            req.user.id,
            req.user.id,
            req.user.id
        ];

        if (search && search.trim()) {
            const keyword = `%${search.trim()}%`;

            sql += `
                AND (
                    u.full_name LIKE ?
                    OR u.email LIKE ?
                )
            `;

            params.push(
                keyword,
                keyword
            );
        }

        sql += `
            ORDER BY u.full_name ASC
        `;

        const [friends] = await db.query(sql, params);

        return res.status(200).json({
            total: friends.length,
            friends
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Hủy kết bạn
|--------------------------------------------------------------------------
*/
const removeFriend = async (req, res) => {
    try {
        const { userId } = req.params;

        const currentUserId = Number(req.user.id);
        const friendUserId = Number(userId);

        if (
            !Number.isInteger(friendUserId) ||
            friendUserId <= 0
        ) {
            return res.status(400).json({
                message: "Mã người dùng không hợp lệ"
            });
        }

        if (currentUserId === friendUserId) {
            return res.status(400).json({
                message: "Không thể thực hiện thao tác này với chính mình"
            });
        }

        const [friendships] = await db.query(
            `
            SELECT
                id,
                requester_id,
                receiver_id,
                status
            FROM friendships
            WHERE status = 'accepted'
            AND (
                (
                    requester_id = ?
                    AND receiver_id = ?
                )
                OR
                (
                    requester_id = ?
                    AND receiver_id = ?
                )
            )
            LIMIT 1
            `,
            [
                currentUserId,
                friendUserId,
                friendUserId,
                currentUserId
            ]
        );

        if (friendships.length === 0) {
            return res.status(404).json({
                message: "Hai người hiện không phải bạn bè"
            });
        }

        await db.query(
            `
            DELETE FROM friendships
            WHERE id = ?
            `,
            [friendships[0].id]
        );

        return res.status(200).json({
            message: "Hủy kết bạn thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

/*
|--------------------------------------------------------------------------
| Hủy lời mời kết bạn đã gửi
|--------------------------------------------------------------------------
*/
const cancelFriendRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const friendshipId = Number(id);

        if (
            !Number.isInteger(friendshipId) ||
            friendshipId <= 0
        ) {
            return res.status(400).json({
                message: "Mã lời mời kết bạn không hợp lệ"
            });
        }

        const [friendships] = await db.query(
            `
            SELECT *
            FROM friendships
            WHERE id = ?
            LIMIT 1
            `,
            [friendshipId]
        );

        if (friendships.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy lời mời kết bạn"
            });
        }

        const friendship = friendships[0];

        // Chỉ người gửi mới được hủy lời mời
        if (
            Number(friendship.requester_id) !==
            Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "Bạn không có quyền hủy lời mời này"
            });
        }

        if (friendship.status !== "pending") {
            return res.status(400).json({
                message: "Chỉ có thể hủy lời mời đang chờ xử lý"
            });
        }

        await db.query(
            `
            DELETE FROM friendships
            WHERE id = ?
            `,
            [friendshipId]
        );

        return res.status(200).json({
            message: "Hủy lời mời kết bạn thành công"
        });

    } catch (error) {
        return handleServerError(res, error);
    }
};

module.exports = {
    sendFriendRequest,
    getReceivedFriendRequests,
    getSentFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    removeFriend,
    cancelFriendRequest
};