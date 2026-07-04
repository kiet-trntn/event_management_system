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

// --- ICON GOOGLE CALENDAR TỰ VẼ ĐẦY MÀU SẮC ---
const GoogleCalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#fff" stroke="#4285F4" strokeWidth="2"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke="#34A853" strokeWidth="2" strokeLinecap="round"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" strokeWidth="2"/>
        <rect x="7" y="14" width="4" height="4" rx="1" fill="#FBBC05"/>
        <rect x="13" y="14" width="4" height="4" rx="1" fill="#34A853"/>
    </svg>
);

function WorkCalendar() {
    const navigate = useNavigate();
    
    // Lấy thông tin user đăng nhập
    const user = JSON.parse(localStorage.getItem('user'));

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State mới: Kiểm tra xem user có đang là Leader của sự kiện nào không
    const [isEventLeader, setIsEventLeader] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const fetchCalendarData = useCallback(async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` };
            
            const [myTasksRes, leaderEventsRes] = await Promise.all([
                fetch('http://localhost:5000/api/tasks/my-tasks', { headers }),
                fetch('http://localhost:5000/api/events/leader-calendar', { headers })
            ]);

            let calendarItems = [];

            if (myTasksRes.ok) {
                const data = await myTasksRes.json();
                const myTasks = data.tasks || [];
                
                const formattedTasks = myTasks.map(task => {
                    const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
                    const startTime = new Date(taskDate);
                    startTime.setHours(9, 0, 0, 0);
                    const endTime = new Date(taskDate);
                    endTime.setHours(17, 0, 0, 0);
                    
                    return {
                        id: `task_${task.id}`,
                        real_id: task.id,
                        title: task.title,
                        start: startTime,
                        end: endTime, 
                        allDay: false,
                        type: 'task', 
                        resource: task 
                    };
                });
                calendarItems = [...calendarItems, ...formattedTasks];
            }

            if (leaderEventsRes.ok) {
                const data = await leaderEventsRes.json();
                const ledEvents = data.events || [];

                // Nếu mảng sự kiện trả về có dữ liệu => Chắc chắn người này đang quản lý sự kiện
                if (ledEvents.length > 0) {
                    setIsEventLeader(true);
                }

                const formattedEvents = ledEvents
                    .filter(evt => evt.status !== 'Nháp') 
                    .map(evt => {
                    let eventStart = new Date(evt.start_date);
                    let eventEnd = new Date(evt.end_date);
                    
                    if (eventStart.getHours() === 0 && eventStart.getMinutes() === 0) {
                        eventStart.setHours(9, 0, 0, 0);
                    }
                    if (eventEnd.getHours() === 0 && eventEnd.getMinutes() === 0) {
                        eventEnd.setHours(17, 0, 0, 0);
                    }

                    return {
                        id: `event_${evt.id}`,
                        real_id: evt.id,
                        title: `${evt.title}`, 
                        start: eventStart, 
                        end: eventEnd,   
                        allDay: false,
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

    const handleEventClick = (item) => {
        if (item.type === 'event') {
            navigate(`/staff/events/view/${item.real_id}`);
        } else {
            navigate(`/staff/tasks/view/${item.real_id}`);
        }
    };

    const eventPropGetter = (item) => {
        if (item.type === 'event') {
            return { className: 'calendar-project-block' };
        }

        const status = item.resource.status;
        const dueDate = new Date(item.resource.due_date);
        const today = new Date();
        
        let className = 'calendar-event-in-progress';
        
        if (status === 'completed') className = 'calendar-event-completed';
        else if (status === 'cancelled') className = 'calendar-event-cancelled';
        else if (status === 'submitted') className = 'calendar-event-submitted';
        else if (status !== 'completed' && dueDate < today) className = 'calendar-event-overdue';
        else if (status === 'pending') className = 'calendar-event-pending';

        return { className };
    };

    // --- HÀM XỬ LÝ COPY LINK ĐỒNG BỘ ---
    const handleCopySyncLink = (type, labelName) => {
        const token = localStorage.getItem('my_token');
        if (!token) {
            Swal.fire('Lỗi', 'Không tìm thấy phiên đăng nhập', 'error');
            return;
        }

        const baseUrl = 'http://localhost:5000/api/calendar'; 
        const syncUrl = `${baseUrl}/${type}.ics?token=${token}`;

        navigator.clipboard.writeText(syncUrl).then(() => {
            Swal.fire({
                title: 'Đã copy link đồng bộ!',
                html: `
                    <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                        <p style="margin-bottom: 8px;">Đường link lịch <b>${labelName}</b> đã được lưu vào bộ nhớ tạm.</p>
                        <p style="font-weight: bold; color: #4f46e5; margin-bottom: 8px;">Hướng dẫn thêm vào Google Calendar:</p>
                        <ol style="padding-left: 20px; margin: 0;">
                            <li>Mở <b>Google Calendar</b> trên máy tính.</li>
                            <li>Nhìn sang cột bên trái, mục <b>Other calendars</b>, bấm vào dấu <b>+</b>.</li>
                            <li>Chọn <b>From URL</b> (Từ URL).</li>
                            <li><b>Dán (Paste)</b> đường link vừa copy vào ô trống.</li>
                            <li>Bấm <b>Add calendar</b> (Thêm lịch).</li>
                        </ol>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Đã hiểu',
                confirmButtonColor: '#1a73e8'
            });
        }).catch(() => {
            Swal.fire('Lỗi', 'Không thể copy link, vui lòng thử lại', 'error');
        });
    };

    if (loading && events.length === 0) {
        return (
            <div className="page-container">
                <div className="form-card text-center text-secondary py-6">Đang tải lịch làm việc...</div>
            </div>
        );
    }

    // CSS tuỳ chỉnh cho nút đồng bộ (Màu trắng, viền tinh tế, text đậm)
    const syncBtnStyle = {
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '14px', 
        padding: '8px 16px',
        backgroundColor: '#fff',
        color: '#3c4043',
        border: '1px solid #dadce0',
        borderRadius: '6px',
        fontWeight: '500',
        cursor: 'pointer',
        boxShadow: '0 1px 2px 0 rgba(60,64,67,0.05)',
        transition: 'all 0.2s ease'
    };

    return (
        <div className="page-container">
            <div className="calendar-header-section page-header-form" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h3 className="calendar-title" style={{ margin: 0 }}>Lịch Làm Việc</h3>
                    <div className="calendar-legend" style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span className="legend-item"><span className="legend-color-box pending"></span> Chờ xử lý</span>
                        <span className="legend-item"><span className="legend-color-box in-progress"></span> Đang tiến hành</span>
                        <span className="legend-item"><span className="legend-color-box submitted"></span> Chờ phê duyệt</span>
                        <span className="legend-item"><span className="legend-color-box completed"></span> Hoàn thành</span>
                        <span className="legend-item"><span className="legend-color-box overdue"></span> Trễ hạn</span>
                        <span className="legend-item">
                            <span className="legend-color-box event-progress"></span> Sự kiện
                        </span>
                    </div>
                </div>

                {/* KHỐI NÚT ĐỒNG BỘ NỔI BẬT */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Hiển thị khi là Admin HOẶC thực sự là leader của ít nhất 1 sự kiện */}
                    {(user?.role === 'admin' || isEventLeader) && (
                        <button 
                            onClick={() => handleCopySyncLink('events', 'Sự kiện')} 
                            style={syncBtnStyle}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            <GoogleCalendarIcon />
                            Đồng bộ Sự kiện
                        </button>
                    )}

                    {/* Nút Đồng bộ Công việc ai cũng thấy */}
                    <button 
                        onClick={() => handleCopySyncLink('my-tasks', 'Công việc')} 
                        style={syncBtnStyle}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                        <GoogleCalendarIcon />
                        Đồng bộ Công việc
                    </button>
                </div>
            </div>

            {/* BẢN ĐỒ LỊCH */}
            <div className="form-card large calendar-wrapper" style={{ marginTop: '16px' }}>
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