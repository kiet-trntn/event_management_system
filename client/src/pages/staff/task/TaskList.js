import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

function MyTasks() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Đọc URL từ Header
    const urlSearch = new URLSearchParams(location.search).get('search') || '';
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedOverCol, setDraggedOverCol] = useState(null);

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearch(urlSearch);
        }, 500); 
        return () => clearTimeout(timerId);
    }, [urlSearch]);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);

            // Gửi thẳng search xuống Database
            const response = await fetch(`http://localhost:5000/api/tasks/my-tasks?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTasks(data.tasks || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        document.title = "Công việc của tôi | TaskFlow";
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handleDragStart = (e, task) => {
        if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'submitted') {
            e.preventDefault(); return;
        }
        e.dataTransfer.setData('text/plain', task.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, colId) => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        if (draggedOverCol !== colId) setDraggedOverCol(colId); 
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDraggedOverCol(null);
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        setDraggedOverCol(null); 

        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const taskToMove = tasks.find(t => t.id.toString() === taskId);
        if (!taskToMove || taskToMove.status === newStatus) return; 

        if (newStatus === 'cancelled') return Swal.fire('Từ chối', 'Nhân viên không thể tự ý hủy công việc.', 'warning');
        if (newStatus === 'submitted') return Swal.fire('Từ chối', 'Trạng thái "Chờ phê duyệt" tự động kích hoạt khi nộp file.', 'warning');
        if (newStatus === 'completed') return Swal.fire('Từ chối', 'Bạn không thể tự hoàn thành công việc.', 'warning');

        const oldStatus = taskToMove.status;
        setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: newStatus } : t));

        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cập nhật trạng thái thành công!', showConfirmButton: false, timer: 1500 });
            } else {
                setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: oldStatus } : t));
            }
        } catch (error) {
            setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: oldStatus } : t));
        }
    };

    const columns = [
        { id: 'pending', title: 'Chờ xử lý', titleColor: '#64748b' },
        { id: 'in_progress', title: 'Đang tiến hành', titleColor: '#2563eb' },
        { id: 'submitted', title: 'Chờ phê duyệt', titleColor: '#ea580c' }, 
        { id: 'completed', title: 'Đã hoàn thành', titleColor: '#16a34a' },
        { id: 'cancelled', title: 'Đã hủy', titleColor: '#6b7280' }
    ];

    const getPriorityStyle = (priority) => {
        switch(priority) {
            case 'high': return { bg: '#fee2e2', color: '#dc2626', text: 'Cao' };
            case 'medium': return { bg: '#fef3c7', color: '#d97706', text: 'Thường' };
            default: return { bg: '#f1f5f9', color: '#64748b', text: 'Thấp' };
        }
    };

    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;

    return (
        <div className="page-container" style={{ maxWidth: '100%' }}>
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3>Công Việc Của Tôi</h3>
            </div>

            <div className="kanban-board">
                {columns.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.id); // Lọc thẳng từ State tasks
                    const isDragOver = draggedOverCol === col.id;
                    
                    return (
                        <div key={col.id} className={`kanban-column ${isDragOver ? 'drag-over' : ''}`} onDragOver={(e) => handleDragOver(e, col.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, col.id)}>
                            <div className="kanban-col-header">
                                <h4 style={{ margin: 0, color: col.titleColor, fontSize: '15px', fontWeight: '600' }}>{col.title}</h4>
                                <span className="kanban-col-count">{colTasks.length}</span>
                            </div>

                            <div style={{ flex: 1, minHeight: '50px', display: 'flex', flexDirection: 'column' }}>
                                {colTasks.map(task => {
                                    const prio = getPriorityStyle(task.priority);
                                    const isLocked = ['completed', 'cancelled', 'submitted'].includes(task.status);
                                    return (
                                        <div 
                                            key={task.id} 
                                            className={`kanban-card ${isLocked ? 'locked' : ''}`}
                                            draggable={!isLocked} 
                                            onDragStart={(e) => handleDragStart(e, task)}
                                            onClick={() => navigate(`/staff/tasks/view/${task.id}`)}
                                            style={{ opacity: isLocked ? 0.85 : 1, cursor: isLocked ? 'pointer' : 'grab' }}
                                        >
                                            <div className="kanban-tags" style={{ marginBottom: '8px' }}>
                                                <span className="kanban-tag" style={{ backgroundColor: prio.bg, color: prio.color }}>Ưu tiên: {prio.text}</span>
                                            </div>
                                            <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#111827', fontWeight: '700', lineHeight: '1.4' }}>{task.title}</h5>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}><span style={{ color: '#6b7280' }}>Sự kiện: </span><span style={{ color: '#3b82f6' }}>{task.event_title}</span></p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#626f86' }}>Hạn: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MyTasks;