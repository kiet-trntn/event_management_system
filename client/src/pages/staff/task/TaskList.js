import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function MyTasks() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedOverCol, setDraggedOverCol] = useState(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const response = await fetch('http://localhost:5000/api/tasks/my-tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTasks(data.tasks || []);
            } else {
                Swal.fire('Lỗi', 'Không thể tải danh sách công việc', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Công việc của tôi | TaskFlow";
        fetchTasks();
    }, [fetchTasks]);

    const handleDragStart = (e, task) => {
        if (task.status === 'completed') {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', task.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, colId) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
        if (draggedOverCol !== colId) {
            setDraggedOverCol(colId); 
        }
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

        if (newStatus === 'cancelled') {
            Swal.fire('Từ chối', 'Nhân viên không thể tự ý hủy công việc.', 'warning');
            return;
        }

        if (newStatus === 'completed') {
            Swal.fire({ title: 'Đang kiểm tra dữ liệu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const token = localStorage.getItem('my_token');
                const attachRes = await fetch(`http://localhost:5000/api/attachments/task/${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (attachRes.ok) {
                    const attachData = await attachRes.json();
                    if (!attachData.attachments || attachData.attachments.length === 0) {
                        Swal.fire('Chưa nộp file!', 'Bạn phải bấm vào công việc này để nộp file kết quả trước khi hoàn thành!', 'warning');
                        return; // Chặn kéo thả
                    }
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Không thể kết nối để kiểm tra file.', 'error');
                return;
            }
        }

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
                if (newStatus === 'completed') {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã hoàn thành công việc!', showConfirmButton: false, timer: 1500 });
                } else {
                    Swal.close(); 
                }
            } else {
                setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: oldStatus } : t));
                Swal.fire('Lỗi từ Server', 'Không thể lưu trạng thái', 'error');
            }
        } catch (error) {
            setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: oldStatus } : t));
            Swal.fire('Lỗi kết nối', 'Mất kết nối đến server', 'error');
        }
    };

    const columns = [
        { id: 'pending', title: 'Chờ xử lý', titleColor: '#172b4d' },
        { id: 'in_progress', title: 'Đang tiến hành', titleColor: '#172b4d' },
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
                    const colTasks = tasks.filter(t => t.status === col.id);
                    const isDragOver = draggedOverCol === col.id;
                    
                    return (
                        <div 
                            key={col.id} 
                            className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="kanban-col-header">
                                <h4 style={{ margin: 0, color: col.titleColor, fontSize: '15px', fontWeight: '600' }}>{col.title}</h4>
                                <span className="kanban-col-count">{colTasks.length}</span>
                            </div>

                            <div style={{ flex: 1, minHeight: '50px', display: 'flex', flexDirection: 'column' }}>
                                {colTasks.length === 0 ? (
                                    <div style={{ flex: 1 }}></div>
                                ) : (
                                    colTasks.map(task => {
                                        const prio = getPriorityStyle(task.priority);
                                        const isCompleted = task.status === 'completed';

                                        return (
                                            <div 
                                                key={task.id} 
                                                className={`kanban-card ${isCompleted ? 'locked' : ''}`}
                                                draggable={!isCompleted} 
                                                onDragStart={(e) => handleDragStart(e, task)}
                                                onClick={() => navigate(`/staff/tasks/view/${task.id}`)}
                                            >
                                                <div className="kanban-tags" style={{ marginBottom: '8px' }}>
                                                    <span className="kanban-tag" style={{ backgroundColor: prio.bg, color: prio.color }}>
                                                        Ưu tiên: {prio.text}
                                                    </span>
                                                </div>

                                                <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#111827', fontWeight: '700', lineHeight: '1.4' }}>
                                                    {task.title}
                                                </h5>
                                                
                                                <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
                                                    <span style={{ color: '#6b7280' }}>Sự kiện: </span>
                                                    <span style={{ color: '#3b82f6' }}>{task.event_title}</span>
                                                </p>

                                                <p style={{ margin: 0, fontSize: '12px', color: '#626f86' }}>
                                                    ⏳ Hạn: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}
                                                </p>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );
}

export default MyTasks;