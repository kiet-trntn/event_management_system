import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskTrash() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tự động gọi API lấy danh sách thùng rác khi vào trang
    useEffect(() => {
        document.title = "Thùng rác Công việc | TaskFlow";
        fetchTrashTasks();
    }, []);

    // Hàm gọi API lấy danh sách công việc đã xóa mềm
    const fetchTrashTasks = async () => {
        try {
            // 🌟 CHÚ Ý: Dựa vào taskRoutes.js thì API là /deleted chứ không phải /trash
            const response = await fetch('http://localhost:5000/api/tasks/deleted', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Backend taskController trả về res.json({ total: ..., tasks: [...] })
                setTasks(data.tasks || []);
            } else {
                console.error("Backend báo lỗi:", data.message);
                setTasks([]);
            }
        } catch (err) {
            console.error("Lỗi khi gọi API thùng rác công việc:", err);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý bấm nút Khôi phục
    const handleRestore = async (id) => {
        const result = await Swal.fire({
            title: 'Khôi phục công việc?',
            text: "Công việc này sẽ được đưa trở lại danh sách quản lý.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Khôi phục ngay',
            cancelButtonText: 'Để sau'
        });

        if (result.isConfirmed) {
            try {
                // Gọi API Khôi phục (PATCH)
                const response = await fetch(`http://localhost:5000/api/tasks/${id}/restore`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã khôi phục công việc.', 'success');
                    // Xóa công việc vừa khôi phục ra khỏi giao diện thùng rác
                    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể khôi phục công việc.', 'error');
                }
            } catch (error) {
                console.error("Lỗi khôi phục:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button type="button" className="btn-back" onClick={() => navigate('/admin/tasks')}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại danh sách
                </button>
                <h3>Thùng rác công việc</h3>
            </div>

            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu thùng rác...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center text-secondary form-card mb-6" style={{ maxWidth: '100%' }}>
                    Thùng rác hiện tại đang trống.
                </div>
            ) : (
                <div className="event-grid">
                    {tasks.map(task => (
                        <div key={task.id} className="event-card" style={{ opacity: 0.75 }}>
                            <div className="event-card-header" style={{ marginBottom: '12px' }}>
                                <span className="status-badge status-inactive">
                                    Đã xóa
                                </span>
                            </div>
                            
                            <h4 className="event-title text-secondary" style={{ marginBottom: '12px' }}>
                                {task.title}
                            </h4>
                            
                            {/* Hiển thị thông tin đặc trưng của Công việc */}
                            <p className="event-detail-row">📍 Sự kiện: <strong>{task.event_title}</strong></p>
                            <p className="event-detail-row">👤 Người làm: {task.assigned_name || 'Chưa phân công'}</p>
                            <p className="event-detail-row">🕒 Hạn chót: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}</p>
                            
                            <div className="event-divider"></div>
                            
                            <div className="event-actions">
                                <button className="btn-restore" title="Khôi phục công việc" onClick={() => handleRestore(task.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TaskTrash;