const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    getAllTasks,
    getTaskById,
    getMyTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getDeletedTasks,
    getTaskHistory,
    permanentDeleteTask
} = require("../controllers/taskController");

router.get(
    "/deleted",
    authMiddleware,
    getDeletedTasks
);

router.get(
    "/my-tasks",
    authMiddleware,
    getMyTasks
);

router.get(
    "/:id/history",
    authMiddleware,
    getTaskHistory
);

router.get(
    "/",
    authMiddleware,
    getAllTasks
);

router.post(
    "/",
    authMiddleware,
    createTask
);

router.get(
    "/:id",
    authMiddleware,
    getTaskById
);

router.put(
    "/:id",
    authMiddleware,
    updateTask
);

router.patch(
    "/:id/status",
    authMiddleware,
    updateTaskStatus
);

router.delete(
    "/:id",
    authMiddleware,
    deleteTask
);

router.patch(
    "/:id/restore",
    authMiddleware,
    restoreTask
);

router.delete(
    "/:id/permanent",
    authMiddleware,
    permanentDeleteTask
);

module.exports = router;