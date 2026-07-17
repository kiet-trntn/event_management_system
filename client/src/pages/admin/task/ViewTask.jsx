import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewTask() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]); 
    const [loading, setLoading] = useState(true);

    const fetchTaskDetail = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [taskRes, historyRes] = await Promise.all([
                fetch(`http://localhost:5000/api/tasks/${id}`, { headers }),
                fetch(`http://localhost:5000/api/tasks/${id}/history`, { headers }).catch(() => null)
            ]);

            if (taskRes.ok) {
                const data = await taskRes.json();
                setTask(data);
            } else {
                Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error').then(() => navigate('/admin/tasks'));
                return;
            }

            if (historyRes && historyRes.ok) {
                const historyData = await historyRes.json();
                setTaskHistory(historyData.history || []);
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        document.title = "Chi tiết công việc | TaskFlow";
        fetchTaskDetail();
    }, [fetchTaskDetail]);

    // HÀM CẬP NHẬT TRẠNG THÁI CHO ADMIN
    const handleUpdateStatus = async (e) => {
        const newStatus = e.target.value;
        
        if (newStatus === 'completed' || newStatus === 'submitted') {
            return Swal.fire('Từ chối', 'Không thể đổi trực tiếp sang Hoàn thành/Chờ duyệt. Vui lòng duyệt bài nộp!', 'warning');
        }

        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã cập nhật trạng thái', showConfirmButton: false, timer: 1500 });
                fetchTaskDetail();
            } else {
                const data = await response.json();
                Swal.fire('Lỗi', data.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
        }
    };

    const handleDelete = async () => { 
        const result = await Swal.fire({
            title: 'Chuyển vào thùng rác?',
            text: "Công việc sẽ được chuyển vào thùng rác hệ thống.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                if (response.ok) {
                    Swal.fire('Đã xóa', 'Công việc đã được chuyển vào thùng rác', 'success');
                    navigate('/admin/tasks');
                } else {
                    Swal.fire('Lỗi', 'Không thể xóa công việc', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
            }
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'completed': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã hoàn thành' };
            case 'in_progress': return { bg: '#dbeafe', color: '#2563eb', text: 'Đang tiến hành' };
            case 'cancelled': return { bg: '#f3f4f6', color: '#6b7280', text: 'Đã hủy' };
            case 'submitted': return { bg: '#f3f4f6', color: '#6b7280', text: 'Chờ phê duyệt' };
            default: return { bg: '#fef9c3', color: '#ca8a04', text: 'Chờ xử lý' }; 
        }
    };

    const getPriorityStyle = (priority) => {
        switch(priority) {
            case 'high': return { bg: '#fee2e2', color: '#dc2626', text: 'Cao' };
            case 'medium': return { bg: '#fef3c7', color: '#d97706', text: 'Trung bình' };
            default: return { bg: '#f1f5f9', color: '#64748b', text: 'Thấp' };
        }
    };

    const translateTaskType = (type) => {
        if(type === 'preparation') return 'Chuẩn bị';
        if(type === 'during_event') return 'Diễn ra';
        if(type === 'post_event') return 'Kết thúc';
        return type || 'Khác';
    };

    const translateAction = (actionText) => {
        if (!actionText) return "";
        return actionText
            .replace('pending', 'Chờ xử lý')
            .replace('in_progress', 'Đang tiến hành')
            .replace('completed', 'Đã hoàn thành')
            .replace('cancelled', 'Đã hủy');
    };

    if (loading) return <div className="page-container"><div className="text-center text-secondary">⏳ Đang tải chi tiết...</div></div>;
    if (!task) return null;

    const statusStyle = getStatusStyle(task.status);
    const prioStyle = getPriorityStyle(task.priority);

    const isEventClosedOrCanceled = task.event_status === 'Đã kết thúc' || task.event_status === 'Đã hủy';
    const isTaskLocked = task.status === 'completed' || task.status === 'cancelled' || task.status === 'submitted';

    return (
        <div className="page-container task-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Chi tiết công việc</h3>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                <div className="form-card" style={{ flex: '2 1 500px', margin: 0, padding: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                        {/* SELECT DROPDOWN ĐỂ CẬP NHẬT TRẠNG THÁI */}
                        {isEventClosedOrCanceled || isTaskLocked ? (
                            <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600' }}>
                                {statusStyle.text}
                            </span>
                        ) : (
                            <select 
                                value={task.status} 
                                onChange={handleUpdateStatus}
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, padding: '4px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', border: '1px solid transparent', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="pending" style={{ color: '#000' }}>Chờ xử lý</option>
                                <option value="in_progress" style={{ color: '#000' }}>Đang tiến hành</option>
                                <option value="cancelled" style={{ color: '#000' }}>Hủy công việc</option>
                            </select>
                        )}
                        
                        <span style={{ backgroundColor: prioStyle.bg, color: prioStyle.color, padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600' }}>
                            Ưu tiên: {prioStyle.text}
                        </span>
                    </div>

                    <h2 style={{ fontSize: '24px', color: '#111827', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                        {task.title}
                    </h2>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <strong style={{ width: '120px', color: '#4B5563', fontSize: '14px' }}>Sự kiện:</strong>
                                <span style={{ color: '#2563EB', fontWeight: '500' }}>{task.event_title}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <strong style={{ width: '120px', color: '#4B5563', fontSize: '14px' }}>Giai đoạn:</strong>
                                <span style={{ color: '#111827' }}>{translateTaskType(task.task_type)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <strong style={{ width: '120px', color: '#4B5563', fontSize: '14px' }}>Người tạo:</strong>
                                <span style={{ color: '#111827' }}>{task.created_by_name || 'Hệ thống'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <strong style={{ width: '120px', color: '#4B5563', fontSize: '14px' }}>Giao cho:</strong>
                                <span style={{ color: '#111827', fontWeight: '500' }}>{task.assigned_name || 'Chưa giao cho ai'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <strong style={{ width: '120px', color: '#4B5563', fontSize: '14px' }}>Hạn chót:</strong>
                                <span style={{ color: '#EF4444', fontWeight: '500' }}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '16px', color: '#111827', marginBottom: '8px' }}>Mô tả công việc:</h4>
                        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap', minHeight: '100px' }}>
                            {task.description || 'Không có mô tả chi tiết cho công việc này.'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB', justifyContent: 'flex-end' }}>
                        <button 
                            className="btn-secondary" 
                            style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => navigate(`/admin/tasks/${task.id}/attachments`)}
                            title="Xem và quản lý tài liệu công việc này"
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Quản lý File
                        </button>
                        
                        {!isEventClosedOrCanceled && (
                            <>
                                <button 
                                    className="btn-primary" 
                                    style={{ backgroundColor: '#6B7280', borderColor: '#6B7280', color: '#fff' }} 
                                    onClick={handleDelete}
                                >
                                    Xóa
                                </button>
                                <button 
                                    className="btn-primary" 
                                    style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6', color: '#fff' }} 
                                    onClick={() => navigate(`/admin/tasks/edit/${task.id}`)}
                                >
                                    Sửa
                                </button>    
                            </>
                        )}
                    </div>
                </div>

                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#F8FAFC' }}>
                        <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Lịch sử hoạt động
                        </h4>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            {taskHistory.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center' }}>Chưa có hoạt động nào.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px solid #E2E8F0', marginLeft: '10px', paddingLeft: '20px' }}>
                                    {taskHistory.map((history, index) => (
                                        <div key={history.id} style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: index === 0 ? '#3B82F6' : '#94A3B8', border: '2px solid #F8FAFC' }}></div>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#111827', lineHeight: '1.4' }}>
                                                <span style={{ fontWeight: '600', color: '#2563EB' }}>{history.full_name}</span> {translateAction(history.action)}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
                                                {new Date(history.created_at).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default ViewTask;