import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskList() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- STATE CHO BỘ LỌC CÔNG VIỆC ---
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterTaskType, setFilterTaskType] = useState(''); 
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // 🛑 THÊM STATE: Cho phép Admin chọn ẩn/hiển thị sự kiện đã đóng hoặc hủy
    const [showClosedEvents, setShowClosedEvents] = useState(false);

    const [expandedEvents, setExpandedEvents] = useState({});

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            
            if (filterStatus) queryParams.append('status', filterStatus);
            if (filterPriority) queryParams.append('priority', filterPriority);
            if (filterTaskType) queryParams.append('task_type', filterTaskType); 
            if (fromDate) queryParams.append('from_date', fromDate);
            if (toDate) queryParams.append('to_date', toDate);

            const response = await fetch(`http://localhost:5000/api/tasks?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();

            if (response.ok) {
                setTasks(data.tasks || []);
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể tải công việc', 'error');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterPriority, filterTaskType, fromDate, toDate]);

    useEffect(() => {
        document.title = "Quản lý công việc | TaskFlow";
        fetchTasks();
    }, [fetchTasks]);

    const handleReset = () => {
        setFilterStatus('');
        setFilterPriority('');
        setFilterTaskType('');
        setFromDate('');
        setToDate('');
        setShowClosedEvents(false); // Reset bộ lọc đóng/hủy
    };

    const taskTypeOrder = { 'preparation': 1, 'during_event': 2, 'post_event': 3 };

    // --- GOM NHÓM & LỌC SỰ KIỆN ĐÃ HỦY/KẾT THÚC THEO Ý ĐỊNH ADMIN ---
    const groupedTasks = [];
    const groups = {};
    
    tasks.forEach(task => {
        // 🛑 LỌC: Nếu Admin KHÔNG chọn "Show sự kiện đóng/hủy", ta sẽ bỏ qua các task này
        if (!showClosedEvents && (task.event_status === 'Đã kết thúc' || task.event_status === 'Đã hủy')) {
            return;
        }

        const eventId = task.event_id || 'other';
        // Lưu kèm trạng thái của sự kiện vào group để Frontend xử lý giao diện
        if (!groups[eventId]) {
            groups[eventId] = { 
                eventId: eventId, 
                eventTitle: task.event_title || 'Công việc độc lập', 
                eventStatus: task.event_status, // 👈 Lưu trạng thái sự kiện
                tasks: [] 
            };
        }
        groups[eventId].tasks.push(task);
    });

    Object.values(groups).forEach(group => {
        group.tasks.sort((a, b) => (taskTypeOrder[a.task_type] || 99) - (taskTypeOrder[b.task_type] || 99));
        groupedTasks.push(group);
    });

    const toggleExpand = (eventId) => {
        setExpandedEvents(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'completed': return { class: 'badge-pill badge-green', label: 'Đã hoàn thành' };
            case 'in_progress': return { class: 'badge-pill badge-blue', label: 'Đang tiến hành' };
            case 'cancelled': return { class: 'badge-pill badge-gray', label: 'Đã hủy' };
            case 'submitted': return { class: 'badge-pill badge-gray', label: 'Chờ phê duyệt' };
            default: return { class: 'badge-pill badge-yellow', label: 'Chờ xử lý' }; 
        }
    };

    const getPriorityIcon = (priority) => {
        switch(priority) {
            case 'high': return <span style={{ color: '#ef4444' }}>Cao</span>;
            case 'medium': return <span style={{ color: '#f59e0b' }}>Trung Bình</span>;
            default: return <span style={{ color: '#10b981' }}>Thấp</span>;
        }
    };

    const getTaskTypeLabel = (type) => {
        if(type === 'preparation') return 'Chuẩn bị';
        if(type === 'during_event') return 'Diễn ra';
        if(type === 'post_event') return 'Kết thúc';
        return type || 'Khác';
    };

    return (
        <div className="page-container event-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Quản lý Công việc</h1>
                <button className="btn-primary" onClick={() => navigate('/admin/tasks/add')}>
                    + Thêm công việc
                </button>
            </div>

            <div className="form-card" style={{ maxWidth: '100%', padding: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 140px' }}>
                        <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="in_progress">Đang tiến hành</option>
                            <option value="submitted">Chờ phê duyệt</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                        <select className="form-input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                            <option value="">Tất cả độ ưu tiên</option>
                            <option value="high">Cao</option>
                            <option value="medium">Trung bình</option>
                            <option value="low">Thấp</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                        <select className="form-input" value={filterTaskType} onChange={(e) => setFilterTaskType(e.target.value)}>
                            <option value="">Tất cả giai đoạn</option>
                            <option value="preparation">Chuẩn bị</option>
                            <option value="during_event">Diễn ra</option>
                            <option value="post_event">Kết thúc</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 130px' }}>
                        <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div style={{ flex: '1 1 130px' }}>
                        <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />                   
                    </div>
                    
                    {/* 🛑 CHECKBOX ĐỂ ADMIN CHỦ ĐỘNG BẬT XEM SK ĐÃ HỦY/ĐÓNG */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>
                        <input 
                            type="checkbox" 
                            id="toggleClosed" 
                            checked={showClosedEvents} 
                            onChange={(e) => setShowClosedEvents(e.target.checked)} 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="toggleClosed" style={{ cursor: 'pointer' }}>Hiện sự kiện đã đóng/hủy</label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button type="button" className="btn-secondary" onClick={handleReset}>Xóa lọc</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-secondary mb-6 form-card">Đang tải dữ liệu...</div>
            ) : groupedTasks.length === 0 ? (
                <div className="text-center text-secondary mb-6 form-card">Không có công việc nào khớp với bộ lọc hoặc toàn bộ sự kiện đã đóng/hủy.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {groupedTasks.map(group => {
                        const isExpanded = expandedEvents[group.eventId];
                        const displayTasks = isExpanded ? group.tasks : group.tasks.slice(0, 5);
                        const hasMore = group.tasks.length > 4;

                        const isEventCanceled = group.eventStatus === 'Đã hủy';
                        const isEventFinished = group.eventStatus === 'Đã kết thúc';

                        return (
                            <div key={group.eventId} className="mb-6" style={{ opacity: (isEventCanceled || isEventFinished) ? 0.75 : 1 }}>
                                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {group.eventTitle} 
                                    
                                    {isEventCanceled && <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: 'bold' }}>[SỰ KIỆN ĐÃ HỦY]</span>}
                                    {isEventFinished && <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: 'bold' }}>[SỰ KIỆN KẾT THÚC]</span>}
                                    
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'normal' }}>({group.tasks.length})</span>
                                </h3>

                                <div className="event-grid">
                                    {displayTasks.map(task => {
                                        const statusData = getStatusStyle(task.status);
                                        return (
                                            <div key={task.id} className="event-card" onClick={() => navigate(`/admin/tasks/view/${task.id}`)} style={{ cursor: 'pointer', borderLeft: (isEventCanceled || isEventFinished) }}>
                                                <div className="event-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span className={statusData.class}>{statusData.label}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{getPriorityIcon(task.priority)}</span>
                                                </div>
                                                <h4 className="event-title" style={{ textDecoration: isEventCanceled }}>{task.title}</h4>
                                                <p className="event-detail-row">Giai đoạn: <span style={{ fontWeight: '500' }}>{getTaskTypeLabel(task.task_type)}</span></p>
                                                <p className="event-detail-row">Hạn: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}</p>
                                                <p className="event-detail-row">Giao cho: <span style={{ fontWeight: '500', color: 'var(--primary-color)' }}>{task.assigned_name ? task.assigned_name : 'Chưa phân công'}</span></p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {hasMore && (
                                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                        <button onClick={() => toggleExpand(group.eventId)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                            {isExpanded ? 'Thu gọn ⏶' : `Xem thêm ${group.tasks.length - 5} công việc nữa ⏷`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default TaskList;