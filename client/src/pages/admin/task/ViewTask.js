import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewTask() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchTaskDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            if (response.ok) setTask(data);
            else Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error').then(() => navigate('/admin/tasks'));
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

    const handleDelete = async () => { 
        const result = await Swal.fire({
            title: 'Chuyển vào thùng rác?',
            text: "Công việc sẽ được chuyển vào thùng rác và có thể khôi phục lại sau này.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                        'Content-Type': 'application/json'
                     }
                });
        
                const data = await response.json();
                    
                if (response.ok) {
                     Swal.fire('Đã xóa!', 'Công việc đã được đưa vào thùng rác.', 'success')
                        .then(() => navigate('/admin/tasks'));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể xóa công việc.', 'error');
                }
                } catch (error) {
                    console.error("Lỗi xóa:", error);
                    Swal.fire('Lỗi!', 'Không thể kết nối máy chủ.', 'error');
                }
            }
    };


    const handleStatusUpdate = async (newStatus) => {
        const result = await Swal.fire({
            title: 'Cập nhật trạng thái?',
            text: "Bạn có chắc muốn đổi trạng thái công việc này?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã cập nhật trạng thái.', 'success');
                    fetchTaskDetail();
                }
            } catch (error) { Swal.fire('Lỗi', 'Kết nối thất bại', 'error'); }
        }
    };

    if (loading) return <div className="text-center py-6">Đang tải...</div>;
    if (!task) return null;

    const isLocked = task.status === 'completed' || task.status === 'cancelled';

    return (
        <div className="page-container event-page">
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate('/admin/tasks')}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Chi tiết công việc</h3>
            </div>
            <div className="form-card large">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{task.title}</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* 🌟 Đã xóa thuộc tính disabled={isLocked} ở đây để luôn cho phép đổi trạng thái */}
                        <select 
                            className="form-input" 
                            style={{ width: '150px', cursor: 'pointer' }} 
                            value={task.status} 
                            onChange={(e) => handleStatusUpdate(e.target.value)}
                        >
                            <option value="pending">Chờ xử lý</option>
                            <option value="in_progress">Đang tiến hành</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#F8FAFC', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>📍 Sự kiện</p>
                        <p className="font-semibold">{task.event_title}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>👤 Người phụ trách</p>
                        <p className="font-semibold">{task.assigned_name || 'Chưa phân công'}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>🕒 Hạn chót</p>
                        <p className="font-semibold">{task.due_date ? new Date(task.due_date).toLocaleString('vi-VN') : 'Không có hạn'}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>🔥 Độ ưu tiên</p>
                        <p className="font-semibold">
                            {task.priority === 'high' ? 'CAO' : task.priority === 'medium' ? 'TRUNG BÌNH' : task.priority === 'low' ? 'THẤP' : 'CHƯA XÉT'}
                        </p>
                    </div>
                </div>

                <div>
                    <h4 style={{ marginBottom: '12px' }}>Mô tả chi tiết</h4>
                    <p style={{ lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-wrap' }}>
                        {task.description || 'Không có mô tả.'}
                    </p>
                </div>

                {!isLocked && (
                    <>
                        <div className="event-divider" style={{ marginTop: '24px' }}></div>
                        <div className="form-actions">
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
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default ViewTask;