const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadAttachment");

const {
    submitTask,
    reviewSubmission,
    getPendingSubmissions,
    getSubmissionsByTask
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

router.patch(
    "/:id/review",
    authMiddleware,
    reviewSubmission
);

router.get(
    "/task/:taskId",
    authMiddleware,
    getSubmissionsByTask
);



module.exports = router;