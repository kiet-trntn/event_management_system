import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/vi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Swal from 'sweetalert2';

moment.locale('vi');
const localizer = momentLocalizer(moment);

// =======================================================
// TẠO THANH CÔNG CỤ (TOOLBAR) CHUẨN GOOGLE CALENDAR
// =======================================================
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
                    <button className="gg-btn-nav" onClick={goToBack} title="Trước">
                        &#10094; {/* Icon mũi tên trái */}
                    </button>
                    <button className="gg-btn-nav" onClick={goToNext} title="Sau">
                        &#10095; {/* Icon mũi tên phải */}
                    </button>
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

// =======================================================
// COMPONENT LỊCH CHÍNH
// =======================================================
function WorkCalendar() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const fetchTasksForCalendar = useCallback(async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` };
            
            const [myTasksRes, leaderTasksRes] = await Promise.all([
                fetch('http://localhost:5000/api/tasks/my-tasks', { headers }),
                fetch('http://localhost:5000/api/tasks/leader-calendar', { headers })
            ]);

            let allTasks = [];
            if (myTasksRes.ok) {
                const data = await myTasksRes.json();
                allTasks = [...allTasks, ...(data.tasks || [])];
            }
            if (leaderTasksRes.ok) {
                const data = await leaderTasksRes.json();
                allTasks = [...allTasks, ...(data.tasks || [])];
            }

            const uniqueTasksMap = new Map();
            allTasks.forEach(task => uniqueTasksMap.set(task.id, task));
            const uniqueTasks = Array.from(uniqueTasksMap.values());

            const formattedEvents = uniqueTasks.map(task => {
                const eventDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
                let displayTitle = '';
                
                if (String(task.assigned_to) === String(currentUser.id)) {
                    displayTitle = task.title; 
                } else {
                    const firstName = task.assigned_name ? task.assigned_name.split(' ').pop() : 'NV';
                    displayTitle = `[${firstName}] ${task.title}`;
                }

                return {
                    id: task.id,
                    title: displayTitle,
                    start: eventDate,
                    end: eventDate,
                    allDay: true, 
                    resource: task 
                };
            });

            setEvents(formattedEvents);
        } catch (error) {
            console.error("Lỗi tải lịch:", error);
            Swal.fire('Lỗi', 'Mất kết nối với máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        document.title = "Lịch làm việc | TaskFlow";
        fetchTasksForCalendar();
    }, [fetchTasksForCalendar]);

    const handleEventClick = (event) => navigate(`/staff/tasks/view/${event.id}`);

    const eventPropGetter = (event) => {
        let className = 'calendar-event-in-progress';
        const status = event.resource.status;
        const dueDate = new Date(event.resource.due_date);
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
                    
                    components={{
                        toolbar: CustomToolbar
                    }}
                    
                    messages={{
                        noEventsInRange: "Không có công việc nào trong khoảng thời gian này.",
                        showMore: total => `+${total} nữa`
                    }}
                />
            </div>
        </div>
    );
}

export default WorkCalendar;