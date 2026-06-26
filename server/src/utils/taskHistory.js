const db = require("../config/db");

const addTaskHistory = async (
    taskId,
    action,
    userId
) => {

    await db.query(
        `
        INSERT INTO task_history
        (
            task_id,
            action,
            performed_by
        )
        VALUES (?, ?, ?)
        `,
        [
            taskId,
            action,
            userId
        ]
    );

};

module.exports = addTaskHistory;