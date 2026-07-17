import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

function MyTasks() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const urlSearch = new URLSearchParams(location.search).get('search') || '';
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedOverCol, setDraggedOverCol] = useState(null);
    const [filterTaskType, setFilterTaskType] = useState(''); 

    // STATE LƯU USER VÀ CHẾ ĐỘ XEM
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('all'); 
    const [isLeaderDetected, setIsLeaderDetected] = useState(false); 

    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) { 
                const decoded = JSON.parse(window.atob(token.split('.')[1]));
                setCurrentUser(decoded);
            }
        } catch (e) { 
            console.error("Lỗi giải mã token:", e); 
        }
    }, []);

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearch(urlSearch);
        }, 500); 
        return () => clearTimeout(timerId);
    }, [urlSearch]);

    const fetchTasks = useCallback(async () => {
        if (!currentUser) return; 
        
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (filterTaskType) queryParams.append('task_type', filterTaskType); 

            const endpoint = viewMode === 'all'
                ? 'http://localhost:5000/api/tasks'            
                : 'http://localhost:5000/api/tasks/my-tasks';   

            const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const fetchedTasks = data.tasks || [];

                if (currentUser.role !== 'admin' && !isLeaderDetected) {
                    const checkLeader = fetchedTasks.some(t => Number(t.event_leader_id) === Number(currentUser.id));
                    
                    if (checkLeader) {
                        setIsLeaderDetected(true); 
                    } else if (viewMode === 'all') {
                        setViewMode('mine');
                        return; 
                    }
                }

                setTasks(fetchedTasks);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterTaskType, currentUser, viewMode, isLeaderDetected]);

    useEffect(() => {
        document.title = "Bảng công việc | TaskFlow";
        fetchTasks();
    }, [fetchTasks]);

    const handleDragStart = (e, task) => {
        if (
            task.status === 'completed' || task.status === 'cancelled' || task.status === 'submitted' ||
            task.event_status === 'Đã kết thúc' || task.event_status === 'Đã hủy'
        ) {
            e.preventDefault(); 
            return;
        }

        const isEventLeader = currentUser && (Number(task.event_leader_id) === Number(currentUser.id));
        const isAssignedUser = currentUser && (Number(task.assigned_to) === Number(currentUser.id));
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (!isEventLeader && !isAssignedUser && !isAdmin) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', task.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, colId) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
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

        const isEventLeader = currentUser && (Number(taskToMove.event_leader_id) === Number(currentUser.id));
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (newStatus === 'cancelled' && !isEventLeader && !isAdmin) {
            return Swal.fire('Từ chối', 'Chỉ Quản lý sự kiện mới có quyền hủy công việc này.', 'warning');
        }

        if (newStatus === 'submitted') return Swal.fire('Từ chối', 'Trạng thái "Chờ phê duyệt" tự động kích hoạt khi nộp file.', 'warning');
        if (newStatus === 'completed') return Swal.fire('Từ chối', 'Bạn không thể tự hoàn thành. Vui lòng vào trang Chi tiết và Duyệt bài nộp.', 'warning');

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
                const errorData = await response.json();
                Swal.fire('Lỗi', errorData.message || 'Không thể cập nhật trạng thái', 'error');
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

    const translateTaskType = (type) => {
        if(type === 'preparation') return 'Chuẩn bị';
        if(type === 'during_event') return 'Diễn ra';
        if(type === 'post_event') return 'Kết thúc';
        return type || 'Khác';
    };

    const taskTypeOrder = { 'preparation': 1, 'during_event': 2, 'post_event': 3 };

    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;

    const showToggle = currentUser && (currentUser.role === 'admin' || isLeaderDetected);

    return (
        <div className="page-container" style={{ maxWidth: '100%' }}>
            
            {/* --- HEADER ĐƯỢC LÀM LẠI GIỐNG 100% ẢNH CỦA BẠN --- */}
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                
                {/* NHÓM TRÁI: Tiêu đề + Nút chuyển đổi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                        {viewMode === 'all' ? 'Bảng chung sự kiện' : 'Công Việc Của Tôi'}
                    </h3>
                    
                    {showToggle && (
                        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                            <button 
                                onClick={() => setViewMode('all')}
                                style={{ 
                                    padding: '6px 16px', 
                                    backgroundColor: viewMode === 'all' ? '#ffffff' : 'transparent', 
                                    color: viewMode === 'all' ? '#1e293b' : '#64748b', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    cursor: 'pointer', 
                                    fontWeight: '600', 
                                    fontSize: '14px', 
                                    boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Bảng chung sự kiện
                            </button>
                            <button 
                                onClick={() => setViewMode('mine')}
                                style={{ 
                                    padding: '6px 16px', 
                                    backgroundColor: viewMode === 'mine' ? '#ffffff' : 'transparent', 
                                    color: viewMode === 'mine' ? '#1e293b' : '#64748b', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    cursor: 'pointer', 
                                    fontWeight: '600', 
                                    fontSize: '14px', 
                                    boxShadow: viewMode === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Việc tôi được giao
                            </button>
                        </div>
                    )}
                </div>

                {/* NHÓM PHẢI: Dropdown chọn giai đoạn */}
                <div style={{ width: '220px' }}>
                    <select 
                        className="form-input" 
                        value={filterTaskType} 
                        onChange={(e) => setFilterTaskType(e.target.value)} 
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="">-- Tất cả giai đoạn --</option>
                        <option value="preparation">Chuẩn bị</option>
                        <option value="during_event">Diễn ra</option>
                        <option value="post_event">Kết thúc</option>
                    </select>
                </div>
            </div>

            {/* --- KANBAN BOARD --- */}
            <div className="kanban-board">
                {columns.map(col => {
                    const colTasks = tasks
                        .filter(t => t.status === col.id)
                        .sort((a, b) => (taskTypeOrder[a.task_type] || 99) - (taskTypeOrder[b.task_type] || 99));
                        
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
                                    
                                    const canDrag = currentUser && (Number(task.event_leader_id) === Number(currentUser.id) || Number(task.assigned_to) === Number(currentUser.id) || currentUser.role === 'admin');

                                    return (
                                        <div 
                                            key={task.id} 
                                            className={`kanban-card ${isLocked ? 'locked' : ''}`}
                                            draggable={!isLocked && canDrag} 
                                            onDragStart={(e) => handleDragStart(e, task)}
                                            onClick={() => navigate(`/staff/tasks/view/${task.id}`)}
                                            style={{ opacity: isLocked ? 0.85 : 1, cursor: isLocked ? 'pointer' : (canDrag ? 'grab' : 'not-allowed') }}
                                        >
                                            <div className="kanban-tags" style={{ marginBottom: '8px' }}>
                                                <span className="kanban-tag" style={{ backgroundColor: prio.bg, color: prio.color }}>Ưu tiên: {prio.text}</span>
                                                <span className="kanban-tag" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>{translateTaskType(task.task_type)}</span>
                                            </div>
                                            <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#111827', fontWeight: '700', lineHeight: '1.4' }}>{task.title}</h5>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}><span style={{ color: '#6b7280' }}>Sự kiện: </span><span style={{ color: '#3b82f6' }}>{task.event_title}</span></p>
                                            
                                            {viewMode === 'all' && (
                                                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569' }}>
                                                    <span style={{ color: '#6b7280' }}>Giao cho: </span>
                                                    <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{task.assigned_name || 'Chưa phân công'}</span>
                                                </p>
                                            )}

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