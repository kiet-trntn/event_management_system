import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]); // Thêm state cho Lịch sử
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // Lưu thông tin người đang đăng nhập

    // --- 0. HÀM GIẢI MÃ TOKEN ĐỂ LẤY ID NGƯỜI DÙNG ---
    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) {
                // Giải mã payload của JWT Token
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setCurrentUser(payload);
            }
        } catch (error) {
            console.error("Lỗi giải mã token:", error);
        }
    }, []);

    // --- 1. LẤY DỮ LIỆU CÔNG VIỆC, FILE VÀ LỊCH SỬ ---
    const fetchTaskData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Gọi luôn 3 API cùng lúc cho nhanh
            const [taskRes, attachRes, historyRes] = await Promise.all([
                fetch(`http://localhost:5000/api/tasks/${id}`, { headers }),
                fetch(`http://localhost:5000/api/attachments/task/${id}`, { headers }).catch(() => null),
                fetch(`http://localhost:5000/api/tasks/${id}/history`, { headers }).catch(() => null)
            ]);

            if (taskRes.ok) {
                const taskData = await taskRes.json();
                setTask(taskData);

                if (attachRes && attachRes.ok) {
                    const attachData = await attachRes.json();
                    setAttachments(attachData.attachments || []);
                }

                if (historyRes && historyRes.ok) {
                    const historyData = await historyRes.json();
                    setTaskHistory(historyData.history || []);
                }
            } else {
                Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error');
                navigate('/staff/tasks');
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

    // --- 2. XỬ LÝ NỘP FILE (UPLOAD) ---
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            return Swal.fire('Lỗi', 'Dung lượng file không được vượt quá 10MB', 'warning');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_id', id);

        try {
            setUploading(true);
            const token = localStorage.getItem('my_token');
            
            const response = await fetch('http://localhost:5000/api/attachments', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, 
                body: formData 
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nộp file thành công', showConfirmButton: false, timer: 1500 });
                setAttachments([data.attachment, ...attachments]);
                fetchTaskData(); // Gọi lại để cập nhật luôn Lịch sử thao tác (hiện log vừa nộp file)
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể upload file', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
        } finally {
            setUploading(false);
            event.target.value = null; 
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đang chuẩn bị file...', showConfirmButton: false, timer: 1500 });
            
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/attachments/${fileId}/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
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
                window.URL.revokeObjectURL(url);
            } else {
                const data = await response.json();
                Swal.fire('Lỗi', data.message || 'Không thể tải file', 'error');
            }
        } catch (error) {
            console.error("Lỗi khi tải file:", error);
            Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
        }
    };

    // --- 3. XỬ LÝ NÚT CHỐT HOÀN THÀNH ---
    const handleCompleteTask = async () => {
        if (attachments.length === 0) {
            return Swal.fire('Cảnh báo', 'Bạn cần tải lên ít nhất 1 file kết quả trước khi hoàn thành công việc này!', 'warning');
        }

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
                    setTask({ ...task, status: 'completed' }); 
                    fetchTaskData(); // Load lại để update lịch sử
                } else {
                    Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
            }
        }
    };

    const translateAction = (actionText) => {
        if (!actionText) return "";
        return actionText
            .replace('pending', 'Chờ xử lý')
            .replace('in_progress', 'Đang tiến hành')
            .replace('completed', 'Đã hoàn thành')
            .replace('cancelled', 'Đã hủy');
    };

    // --- 4. GIAO DIỆN ---
    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;
    if (!task) return null;

    // QUAN TRỌNG: Kiểm tra xem người đang đăng nhập có phải là người được giao việc (hoặc Admin) không?
    const isAssignedUser = currentUser && (task.assigned_to === currentUser.id || currentUser.role === 'admin');

    return (
        <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#4f46e5', fontWeight: '600' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Quay lại
            </button>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* --- CỘT TRÁI: THÔNG TIN CÔNG VIỆC --- */}
                <div className="form-card" style={{ flex: '2 1 500px', margin: 0, padding: '24px' }}>
                    <h2 style={{ fontSize: '26px', margin: '0 0 8px 0', color: '#111827', fontWeight: '700' }}>
                        {task.title}
                    </h2>
                    
                    <p style={{ margin: '0 0 24px 0', fontSize: '15px' }}>
                        <span style={{ color: '#6b7280' }}>Sự kiện: </span>
                        <span style={{ color: '#3b82f6', fontWeight: '500' }}>{task.event_title}</span>
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#374151' }}>
                        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                            <div>
                                👑 <strong style={{ color: '#4b5563' }}>Người giao: </strong> 
                                <span style={{ color: '#2563eb' }}>{task.created_by_name || 'Hệ thống'}</span>
                            </div>
                            
                            <div>
                                📍 <strong style={{ color: '#4b5563' }}>Độ ưu tiên: </strong> 
                                {task.priority === 'high' ? <span style={{color: '#dc2626', fontWeight: '600'}}>Cao</span> : task.priority === 'medium' ? <span style={{color: '#d97706', fontWeight: '600'}}>Trung bình</span> : 'Thấp'}
                            </div>
                        </div>
                        
                        <div>
                            📅 <strong style={{ color: '#4b5563' }}>Hạn chót: </strong> 
                            <span style={{ color: '#EF4444', fontWeight: '500' }}>
                                {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '20px', backgroundColor: '#2563eb', borderRadius: '2px' }}></div>
                            Mô tả chi tiết
                        </h4>
                        <p style={{ color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap', paddingLeft: '12px' }}>
                            {task.description || 'Không có mô tả chi tiết cho công việc này.'}
                        </p>
                    </div>
                </div>

                {/* --- CỘT PHẢI: KHU VỰC NỘP FILE & LỊCH SỬ --- */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* KHỐI 1: TỆP ĐÍNH KÈM */}
                    <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Tệp đính kèm
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px', padding: '2px 8px', borderRadius: '12px' }}>
                                {attachments.length} file
                            </span>
                        </h3>

                        {/* NẾU LÀ NGƯỜI ĐƯỢC GIAO -> Hiện form nộp file. NẾU KHÔNG PHẢI -> Hiện thông báo chặn */}
                        {isAssignedUser ? (
                            task.status !== 'completed' && task.status !== 'cancelled' ? (
                                <label style={{ display: 'block', marginBottom: '20px', cursor: 'pointer' }}>
                                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                                        <svg width="32" height="32" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24" style={{ margin: '0 auto 8px auto' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p style={{ margin: '0 0 4px 0', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                                            {uploading ? 'Đang tải lên...' : 'Nhấn để nộp file kết quả'}
                                        </p>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>Max 10MB</p>
                                    </div>
                                    <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                                </label>
                            ) : (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>
                                    🔒 Công việc đã chốt, không thể nộp thêm file.
                                </div>
                            )
                        ) : (
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontWeight: '600', border: '1px solid #fde68a' }}>
                                Bạn chỉ có quyền xem các tệp đã nộp.
                            </div>
                        )}

                        {attachments.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Chưa có tệp nào được tải lên.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {attachments.map(file => (
                                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                                        <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                            {file.file_type ? file.file_type.substring(0, 4).toUpperCase() : 'FILE'}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.file_name}>
                                                {file.file_name}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    <button 
                                            onClick={() => handleDownload(file.id, file.file_name)} 
                                            style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                        >
                                            Tải
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isAssignedUser && task.status !== 'completed' && task.status !== 'cancelled' && (
                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button 
                                    onClick={handleCompleteTask}
                                    style={{ 
                                        width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
                                        backgroundColor: attachments.length > 0 ? '#10b981' : '#cbd5e1', 
                                        color: '#fff', fontSize: '15px', fontWeight: '600', 
                                        cursor: attachments.length > 0 ? 'pointer' : 'not-allowed',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {attachments.length > 0 ? '✓ Đánh Dấu Hoàn Thành' : 'Hãy nộp file để hoàn thành'}
                                </button>
                            </div>
                        )}
                    </div>

                    {isAssignedUser && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#F8FAFC' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Lịch sử hoạt động
                            </h4>
                            
                            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
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
                    )}

                </div>
            </div>
        </div>
    );
}

export default TaskDetail;