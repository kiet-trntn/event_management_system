const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middlewares/authMiddleware");

const upload =
require("../middlewares/uploadAttachment");

const {
    uploadAttachment,
    getAttachmentsByTask,
    deleteAttachment,
    getDeletedAttachments,
    restoreAttachment,
    downloadAttachment,
    permanentDeleteAttachment
} = require(
    "../controllers/attachmentController"
);

router.delete(
    "/:id/permanent",
    authMiddleware,
    permanentDeleteAttachment
);

router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    uploadAttachment
);

router.get(
    "/deleted",
    authMiddleware,
    getDeletedAttachments
);

router.get(
    "/task/:id",
    authMiddleware,
    getAttachmentsByTask
);

router.delete(
    "/:id/permanent",
    authMiddleware,
    permanentDeleteAttachment
);

router.patch(
    "/:id/restore",
    authMiddleware,
    restoreAttachment
);

router.get(
    "/:id/download",
    authMiddleware,
    downloadAttachment
);

module.exports = router;