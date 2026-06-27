import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]); 
    const [taskHistory, setTaskHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Giải mã token lấy thông tin User đang đăng nhập
    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) { 
                setCurrentUser(JSON.parse(window.atob(token.split('.')[1]))); 
            }
        } catch (e) { 
            console.error("Lỗi giải mã token:", e); 
        }
    }, []);

    const fetchTaskData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [taskRes, attachRes, historyRes] = await Promise.all([
                fetch(`http://localhost:5000/api/tasks/${id}`, { headers }),
                fetch(`http://localhost:5000/api/attachments/task/${id}`, { headers }).catch(() => null),
                fetch(`http://localhost:5000/api/tasks/${id}/history`, { headers }).catch(() => null)
            ]);

            if (taskRes.ok) {
                setTask(await taskRes.json());
                if (historyRes && historyRes.ok) setTaskHistory((await historyRes.json()).history || []);
                if (attachRes && attachRes.ok) {
                    const attachData = await attachRes.json();
                    setAttachments(attachData.attachments || []);
                }
            } else {
                Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error');
                navigate(-1);
            }
        } catch (error) { 
            console.error(error); 
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
        } finally { 
            setLoading(false); 
        }
    }, [id, navigate]);

    useEffect(() => { 
        document.title = "Chi tiết công việc | TaskFlow";
        fetchTaskData(); 
    }, [fetchTaskData]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) return Swal.fire('Lỗi', 'Dung lượng file không được vượt quá 10MB', 'warning');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_id', id);

        try {
            setUploading(true);
            const response = await fetch('http://localhost:5000/api/attachments', { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }, 
                body: formData 
            });
            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nộp file thành công', showConfirmButton: false, timer: 1500 });
                fetchTaskData();
            }
        } catch (error) { 
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error'); 
        } finally { 
            setUploading(false); 
            event.target.value = null; 
        }
    };

    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({ 
            title: 'Xóa tệp này?', 
            text: "Tệp tin sẽ được chuyển vào Thùng rác của hệ thống.", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#6b7280', 
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/attachments/${fileId}`, { 
                    method: 'DELETE', 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` } 
                });
                if (response.ok) {
                    Swal.fire('Đã xóa!', 'Tệp đính kèm đã được đưa vào Thùng rác.', 'success');
                    fetchTaskData();
                } else {
                    const data = await response.json();
                    Swal.fire('Lỗi', data.message || 'Không thể xóa tệp', 'error');
                }
            } catch (e) { 
                Swal.fire('Lỗi', 'Mất kết nối server', 'error'); 
            }
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            const response = await fetch(`http://localhost:5000/api/attachments/${fileId}/download`, { 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` } 
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = fileName;
                document.body.appendChild(a); 
                a.click(); 
                a.remove();
            }
        } catch (e) { 
            console.error(e); 
        }
    };

    const handleCompleteTask = async () => {
        if (attachments.length === 0) return Swal.fire('Cảnh báo', 'Bạn cần tải lên ít nhất 1 file kết quả trước khi hoàn thành công việc này!', 'warning');

        const result = await Swal.fire({
            title: 'Xác nhận hoàn thành?',
            text: "Sau khi hoàn thành sẽ không thể nộp thêm file hoặc thay đổi trạng thái.",
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonText: 'Đồng ý', 
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const response = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: 'completed' })
                });
                if (response.ok) {
                    Swal.fire('Thành công', 'Công việc đã được chốt!', 'success');
                    fetchTaskData();
                }
            } catch (error) { 
                Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error'); 
            }
        }
    };

    const translateAction = (actionText) => {
        if (!actionText) return "";
        return actionText.replace('pending', 'Chờ xử lý').replace('in_progress', 'Đang tiến hành').replace('completed', 'Đã hoàn thành').replace('cancelled', 'Đã hủy');
    };

    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;
    if (!task) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isEventLeader = currentUser && (Number(task.event_leader_id) === Number(currentUser.id)); 
    const isAssignedUser = currentUser && (task.assigned_to === currentUser.id);
    
    const hasManagerRights = isAdmin || isEventLeader;
    const isTaskClosed = task.status === 'completed' || task.status === 'cancelled';

    return (
        <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <button className="btn-back" onClick={() => navigate('/staff/events')}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
            </button>
                {hasManagerRights && !isTaskClosed && (
                    <button className="btn-primary" onClick={() => navigate(`/staff/tasks/edit/${task.id}`)}>
                        Chỉnh sửa công việc
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="form-card" style={{ flex: '2 1 500px', margin: 0, padding: '24px' }}>
                    <h2 style={{ fontSize: '26px', margin: '0 0 8px 0', fontWeight: '700' }}>{task.title}</h2>
                    <p style={{ margin: '0 0 24px 0' }}><span style={{ color: '#6b7280' }}>Sự kiện: </span><span style={{ color: '#3b82f6', fontWeight: '500' }}>{task.event_title}</span></p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6', fontSize: '15px' }}>
                        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                            <div><strong>Người giao: </strong> <span style={{ color: '#2563eb' }}>{task.created_by_name || 'Hệ thống'}</span></div>
                            <div><strong>Độ ưu tiên: </strong> {task.priority === 'high' ? <span style={{color: '#dc2626', fontWeight: '600'}}>Cao</span> : task.priority === 'medium' ? <span style={{color: '#d97706', fontWeight: '600'}}>Trung bình</span> : 'Thấp'}</div>
                        </div>
                        <div><strong>Hạn chót: </strong> <span style={{ color: '#EF4444', fontWeight: '500' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}</span></div>
                    </div>

                    <div>
                        <h4>Mô tả chi tiết</h4>
                        <p style={{ color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{task.description || 'Không có mô tả chi tiết cho công việc này.'}</p>
                    </div>
                </div>

                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="form-card" style={{ margin: 0, padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Tệp đính kèm <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px', padding: '2px 8px', borderRadius: '12px' }}>{attachments.length} file</span>
                        </h3>

                        {isAssignedUser ? (
                            !isTaskClosed ? (
                                <label style={{ display: 'block', marginBottom: '20px', cursor: 'pointer' }}>
                                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                        <p style={{ margin: '0 0 4px 0', color: '#3b82f6', fontWeight: '600' }}>{uploading ? 'Đang tải lên...' : 'Nhấn để nộp file kết quả'}</p>
                                    </div>
                                    <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                                </label>
                            ) : (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>🔒 Công việc đã chốt.</div>
                            )
                        ) : (
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>Bạn có quyền xem/xóa tệp.</div>
                        )}

                        {attachments.map(file => (
                            <div 
                                key={file.id} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '12px 16px', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px', 
                                    marginBottom: '10px',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }} title={file.file_name}>
                                    {file.file_name}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <button 
                                        onClick={() => handleDownload(file.id, file.file_name)} 
                                        style={{ color: '#4f46e5', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                                    >
                                        Tải về
                                    </button>
                                    {(hasManagerRights || isAssignedUser) && !isTaskClosed && (
                                        <button 
                                            onClick={() => handleDeleteFile(file.id)}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: '500', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                                        >
                                            Xóa
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isAssignedUser && !isTaskClosed && (
                            <button onClick={handleCompleteTask} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: attachments.length > 0 ? '#10b981' : '#cbd5e1', color: '#fff', fontWeight: '600', marginTop: '12px' }}>✓ Hoàn thành</button>
                        )}
                    </div>

                    {(isAssignedUser || hasManagerRights) && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#F8FAFC' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Lịch sử hoạt động</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {taskHistory.map(h => (
                                    <p key={h.id} style={{ fontSize: '13px', margin: '0 0 8px 0' }}><span style={{ fontWeight: '600' }}>{h.full_name}</span>: {translateAction(h.action)}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskDetail;