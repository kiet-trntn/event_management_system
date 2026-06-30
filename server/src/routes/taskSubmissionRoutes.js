const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadAttachment");

const {
    submitTask,
    reviewSubmission,
    getPendingSubmissions
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



module.exports = router;