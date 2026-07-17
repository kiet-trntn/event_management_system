const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadAttachment");

const {
    submitTask,
    reviewSubmission,
    getPendingSubmissions,
    getSubmissionsByTask,
    downloadSubmissionFile,
    reopenCompletedTask
} = require("../controllers/taskSubmissionController");


router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    submitTask
);

router.get(
    "/pending",
    authMiddleware,
    getPendingSubmissions
);

router.get(
    "/task/:taskId",
    authMiddleware,
    getSubmissionsByTask
);

router.get(
    "/:id/download",
    authMiddleware,
    downloadSubmissionFile
);

router.patch(
    "/:id/review",
    authMiddleware,
    reviewSubmission
);

router.patch(
    "/:id/reopen",
    authMiddleware,
    reopenCompletedTask
);


module.exports = router;