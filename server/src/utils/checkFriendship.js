const db = require("../config/db");

const checkFriendship = async (userId1, userId2) => {
    const firstUserId = Number(userId1);
    const secondUserId = Number(userId2);

    if (
        !Number.isInteger(firstUserId) ||
        !Number.isInteger(secondUserId) ||
        firstUserId <= 0 ||
        secondUserId <= 0
    ) {
        return false;
    }

    if (firstUserId === secondUserId) {
        return false;
    }

    const [friendships] = await db.query(
        `
        SELECT id
        FROM friendships
        WHERE status = 'accepted'
        AND (
            (requester_id = ? AND receiver_id = ?)
            OR
            (requester_id = ? AND receiver_id = ?)
        )
        LIMIT 1
        `,
        [
            firstUserId,
            secondUserId,
            secondUserId,
            firstUserId
        ]
    );

    return friendships.length > 0;
};

module.exports = checkFriendship;