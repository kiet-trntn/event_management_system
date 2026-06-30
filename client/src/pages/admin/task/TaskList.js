import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskList() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [expandedEvents, setExpandedEvents] = useState({});
    const [filterStatus, setFilterStatus] = useState('');

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/tasks', {
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
    }, []);

    useEffect(() => {
        document.title = "Quản lý công việc | TaskFlow";
        fetchTasks();
    }, [fetchTasks]);

    const filteredTasks = useMemo(() => {
        if (!filterStatus) return tasks;
        return tasks.filter(t => t.status === filterStatus);
    }, [tasks, filterStatus]);

    const groupedTasks = useMemo(() => {
        const groups = {};
        filteredTasks.forEach(task => {
            const eventId = task.event_id || 'other';
            const eventTitle = task.event_title || 'Công việc độc lập';
            
            if (!groups[eventId]) {
                groups[eventId] = {
                    eventId: eventId,
                    eventTitle: eventTitle,
                    tasks: []
                };
            }
            groups[eventId].tasks.push(task);
        });
        return Object.values(groups);
    }, [filteredTasks]);

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
            case 'high': return <span title="Ưu tiên cao" style={{ color: '#ef4444' }}>Cao</span>;
            case 'medium': return <span title="Ưu tiên trung bình" style={{ color: '#f59e0b' }}>Trung Bình</span>;
            case 'low': return <span title="Ưu tiên thấp" style={{ color: '#10b981' }}>Thấp</span>;
            default: return '';
        }
    };

    return (
        <div className="page-container event-page">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Quản lý Công việc</h1>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select 
                        className="form-input" 
                        style={{ width: 'auto', padding: '8px 12px', height: '40px' }} 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="in_progress">Đang tiến hành</option>
                        <option value="completed">Đã hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>

                    <button className="btn-primary" style={{ height: '40px' }} onClick={() => navigate('/admin/tasks/add')}>
                        + Thêm công việc
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-secondary mb-6 form-card">Đang tải dữ liệu...</div>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center text-secondary mb-6 form-card">Không có công việc nào phù hợp.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {groupedTasks.map(group => {
                        const isExpanded = expandedEvents[group.eventId];
                        const displayTasks = isExpanded ? group.tasks : group.tasks.slice(0, 4);
                        const hasMore = group.tasks.length > 4;

                        return (
                            <div key={group.eventId} className="mb-6">
                                
                                <h3 className="section-title">
                                    {group.eventTitle} <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'normal' }}>({group.tasks.length})</span>
                                </h3>

                                <div className="event-grid">
                                    {displayTasks.map(task => {
                                        const statusData = getStatusStyle(task.status);
                                        return (
                                            <div key={task.id} className="event-card" onClick={() => navigate(`/admin/tasks/view/${task.id}`)} style={{ cursor: 'pointer' }}>
                                                
                                                <div className="event-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span className={statusData.class}>
                                                        {statusData.label}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                                        {getPriorityIcon(task.priority)}
                                                    </span>
                                                </div>

                                                <h4 className="event-title">{task.title}</h4>

                                                <p className="event-detail-row">
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}
                                                </p>
                                                
                                                <p className="event-detail-row">
                                                    {task.assigned_name ? task.assigned_name : 'Chưa phân công'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {hasMore && (
                                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                        <button 
                                            onClick={() => toggleExpand(group.eventId)}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            {isExpanded ? 'Thu gọn ⏶' : `Xem thêm ${group.tasks.length - 4} công việc nữa ⏷`}
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