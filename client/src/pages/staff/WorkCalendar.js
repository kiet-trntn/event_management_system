import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/vi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Swal from 'sweetalert2';

moment.locale('vi');
const localizer = momentLocalizer(moment);

function WorkCalendar() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // STATE ĐIỀU KHIỂN BỘ LỊCH (GIẢI QUYẾT LỖI KHÔNG CHUYỂN THÁNG ĐƯỢC)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const fetchTasksForCalendar = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/tasks/my-tasks', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                const tasks = data.tasks || [];

                const formattedEvents = tasks.map(task => {
                    const eventDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
                    return {
                        id: task.id,
                        title: `[${task.event_title}] ${task.title}`,
                        start: eventDate,
                        end: eventDate,
                        allDay: true, 
                        resource: task 
                    };
                });

                setEvents(formattedEvents);
            } else {
                Swal.fire('Lỗi', 'Không thể tải lịch làm việc', 'error');
            }
        } catch (error) {
            console.error("Lỗi tải lịch:", error);
            Swal.fire('Lỗi', 'Mất kết nối với máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Lịch làm việc | TaskFlow";
        fetchTasksForCalendar();
    }, [fetchTasksForCalendar]);

    const handleEventClick = (event) => {
        navigate(`/staff/tasks/view/${event.id}`);
    };

    // Hàm trả về ClassName để CSS tự động bắt màu
    const eventPropGetter = (event) => {
        let className = 'calendar-event-in-progress';
        const status = event.resource.status;
        const dueDate = new Date(event.resource.due_date);
        const today = new Date();
        
        if (status === 'completed') {
            className = 'calendar-event-completed';
        } else if (status === 'cancelled') {
            className = 'calendar-event-cancelled';
        } else if (status !== 'completed' && dueDate < today) {
            className = 'calendar-event-overdue';
        } else if (status === 'pending') {
            className = 'calendar-event-pending';
        }

        return { className };
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="form-card text-center text-secondary py-6">Đang tải lịch làm việc...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header Lịch */}
            <div className="calendar-header-section page-header-form">
                <h3 className="calendar-title">Lịch Làm Việc</h3>
                <p className="calendar-subtitle">Theo dõi hạn chót các công việc của bạn theo từng tháng</p>
                
                {/* Chú thích màu sắc */}
                <div className="calendar-legend">
                    <span className="legend-item"><span className="legend-color-box pending"></span> Chờ xử lý</span>
                    <span className="legend-item"><span className="legend-color-box in-progress"></span> Đang tiến hành</span>
                    <span className="legend-item"><span className="legend-color-box completed"></span> Hoàn thành</span>
                    <span className="legend-item"><span className="legend-color-box overdue"></span> Trễ hạn</span>
                </div>
            </div>

            {/* Khung chứa Lịch */}
            <div className="form-card large calendar-wrapper">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    onSelectEvent={handleEventClick}
                    eventPropGetter={eventPropGetter}
                    popup={true}
                    
                    /* BỘ ĐIỀU KHIỂN NÚT BẤM CỦA LỊCH */
                    date={currentDate}
                    onNavigate={(newDate) => setCurrentDate(newDate)}
                    view={currentView}
                    onView={(newView) => setCurrentView(newView)}

                    messages={{
                        next: "Sau",
                        previous: "Trước",
                        today: "Hôm nay",
                        month: "Tháng",
                        week: "Tuần",
                        day: "Ngày",
                        agenda: "Danh sách",
                        noEventsInRange: "Không có công việc nào trong khoảng thời gian này.",
                        showMore: total => `+ Xem thêm (${total})`
                    }}
                />
            </div>
        </div>
    );
}

export default WorkCalendar;