import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/vi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Swal from 'sweetalert2';

moment.locale('vi');
const localizer = momentLocalizer(moment);

// --- Thanh công cụ chuẩn Google Calendar ---
const CustomToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToCurrent = () => toolbar.onNavigate('TODAY');
    const changeView = (e) => toolbar.onView(e.target.value);

    return (
        <div className="gg-toolbar">
            <div className="gg-toolbar-left">
                <button className="gg-btn-today" onClick={goToCurrent}>Hôm nay</button>
                <div className="gg-nav-group">
                    <button className="gg-btn-nav" onClick={goToBack} title="Trước">&#10094;</button>
                    <button className="gg-btn-nav" onClick={goToNext} title="Sau">&#10095;</button>
                </div>
                <span className="gg-toolbar-label">{toolbar.label}</span>
            </div>
            
            <div className="gg-toolbar-right">
                <select className="gg-view-select" value={toolbar.view} onChange={changeView}>
                    <option value="month">Tháng</option>
                    <option value="week">Tuần</option>
                    <option value="day">Ngày</option>
                    <option value="agenda">Danh sách</option>
                </select>
            </div>
        </div>
    );
};

function WorkCalendar() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const fetchCalendarData = useCallback(async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` };
            
            // GỌI 2 API: 1 lấy Việc cá nhân, 1 lấy Sự kiện làm Leader
            const [myTasksRes, leaderEventsRes] = await Promise.all([
                fetch('http://localhost:5000/api/tasks/my-tasks', { headers }),
                fetch('http://localhost:5000/api/events/leader-calendar', { headers }) // Đã đổi sang gọi API events
            ]);

            let calendarItems = [];

            // 1. Xử lý Công việc cá nhân (Thẻ ngắn 1 ngày)
            if (myTasksRes.ok) {
                const data = await myTasksRes.json();
                const myTasks = data.tasks || [];
                
                const formattedTasks = myTasks.map(task => {
                    const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
                    return {
                        id: `task_${task.id}`,
                        real_id: task.id,
                        title: task.title,
                        start: taskDate,
                        end: taskDate, // Việc thì bắt đầu và kết thúc cùng 1 ngày để thành dấu chấm nhỏ
                        allDay: true, 
                        type: 'task', // Phân loại là Task
                        resource: task 
                    };
                });
                calendarItems = [...calendarItems, ...formattedTasks];
            }

            if (leaderEventsRes.ok) {
                const data = await leaderEventsRes.json();
                const ledEvents = data.events || [];

                const formattedEvents = ledEvents.map(evt => {
                    // Lấy ngày kết thúc (end_date) làm mốc hiển thị duy nhất
                    const eventDeadline = evt.end_date ? new Date(evt.end_date) : new Date(evt.start_date);

                    return {
                        id: `event_${evt.id}`,
                        real_id: evt.id,
                        title: `${evt.title}`, // Thêm chữ Hạn chót cho rõ ràng
                        start: eventDeadline, // Bắt đầu ở ngày kết thúc
                        end: eventDeadline,   // Kết thúc cũng ở ngày kết thúc (Tạo thành 1 thẻ ngắn)
                        allDay: true,
                        type: 'event', 
                        resource: evt
                    };
                });
                calendarItems = [...calendarItems, ...formattedEvents];
            }

            setEvents(calendarItems);
        } catch (error) {
            console.error("Lỗi tải lịch:", error);
            Swal.fire('Lỗi', 'Mất kết nối với máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Lịch làm việc | TaskFlow";
        fetchCalendarData();
    }, [fetchCalendarData]);

    // Xử lý khi bấm vào Lịch (Bấm vào việc -> Trang Việc, Bấm vào Sự kiện -> Trang Sự Kiện)
    const handleEventClick = (item) => {
        if (item.type === 'event') {
            navigate(`/staff/events/view/${item.real_id}`);
        } else {
            navigate(`/staff/tasks/view/${item.real_id}`);
        }
    };

    // Đổ màu khác nhau cho Việc cá nhân và Khối Sự kiện
    const eventPropGetter = (item) => {
        let className = 'calendar-event-in-progress';
        
        // Nếu là khối Sự Kiện (Màu tím nổi bật)
        if (item.type === 'event') {
            return { className: 'calendar-project-block' };
        }

        // Nếu là Công việc cá nhân (Màu theo trạng thái)
        const status = item.resource.status;
        const dueDate = new Date(item.resource.due_date);
        const today = new Date();
        
        if (status === 'completed') className = 'calendar-event-completed';
        else if (status === 'cancelled') className = 'calendar-event-cancelled';
        else if (status !== 'completed' && dueDate < today) className = 'calendar-event-overdue';
        else if (status === 'pending') className = 'calendar-event-pending';

        return { className };
    };

    if (loading && events.length === 0) {
        return (
            <div className="page-container">
                <div className="form-card text-center text-secondary py-6">Đang tải lịch làm việc...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="calendar-header-section page-header-form">
                <h3 className="calendar-title">Lịch Làm Việc</h3>
                
                <div className="calendar-legend" style={{ marginTop: '12px' }}>
                    <span className="legend-item"><span className="legend-color-box pending"></span> Chờ xử lý</span>
                    <span className="legend-item"><span className="legend-color-box in-progress"></span> Đang tiến hành</span>
                    <span className="legend-item"><span className="legend-color-box completed"></span> Hoàn thành</span>
                    <span className="legend-item"><span className="legend-color-box overdue"></span> Trễ hạn</span>
                    <span className="legend-item" style={{ marginLeft: '16px' }}>
                        <span className="legend-color-box" style={{ backgroundColor: '#8b5cf6' }}></span> Tiến độ Sự kiện
                    </span>
                </div>
            </div>

            <div className="form-card large calendar-wrapper">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    onSelectEvent={handleEventClick}
                    eventPropGetter={eventPropGetter}
                    popup={true}
                    date={currentDate}
                    onNavigate={(newDate) => setCurrentDate(newDate)}
                    view={currentView}
                    onView={(newView) => setCurrentView(newView)}
                    components={{ toolbar: CustomToolbar }}
                    messages={{
                        noEventsInRange: "Không có lịch trình nào trong khoảng thời gian này.",
                        showMore: total => `+${total} nữa`
                    }}
                />
            </div>
        </div>
    );
}

export default WorkCalendar;