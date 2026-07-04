require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/socket/socket");
const { startDeadlineReminderJob } = require("./src/jobs/deadlineReminderJob");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

startDeadlineReminderJob();