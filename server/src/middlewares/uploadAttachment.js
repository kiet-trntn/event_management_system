const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            path.join(
                __dirname,
                "../uploads/attachments"
            )
        );

    },

    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname);

        const fileName = path.basename(
            file.originalname,
            ext
        );

        const safeFileName = fileName

            // Bỏ dấu tiếng Việt
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")

            // Đổi khoảng trắng thành _
            .replace(/\s+/g, "_")

            // Xóa ký tự đặc biệt
            .replace(/[^a-zA-Z0-9_-]/g, "");

        const uniqueName =
            Date.now() +
            "-" +
            safeFileName +
            ext;

        cb(null, uniqueName);

    }

});


// Kiểm tra loại file
const fileFilter = (
    req,
    file,
    cb
) => {

    const allowedTypes = [

        "image/jpeg",
        "image/png",

        "application/pdf",

        "application/msword",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "application/vnd.ms-excel",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Loại file không được hỗ trợ"
            ),
            false
        );

    }

};

// Giới hạn dung lượng
const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize:
            10 * 1024 * 1024
    }

});

module.exports = upload;