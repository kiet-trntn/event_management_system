const handleServerError = (
    res,
    error,
    message = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau"
) => {

    // Chỉ log lỗi thật ở terminal backend để debug
    console.error(error);

    // Không trả error.message ra frontend
    return res.status(500).json({
        message
    });

};

module.exports = handleServerError;