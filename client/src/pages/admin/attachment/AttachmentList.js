import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AttachmentList() {
    const { id } = useParams(); // Lấy task_id từ URL
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // --- 1. LẤY DỮ LIỆU CÔNG VIỆC VÀ FILE ĐÃ NỘP ---
    const fetchTaskData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [taskRes, attachRes] = await Promise.all([
                fetch(`http://localhost:5000/api/tasks/${id}`, { headers }),
                fetch(`http://localhost:5000/api/attachments/task/${id}`, { headers }).catch(() => null)
            ]);

            if (taskRes.ok) {
                const taskData = await taskRes.json();
                setTask(taskData);

                if (attachRes && attachRes.ok) {
                    const attachData = await attachRes.json();
                    setAttachments(attachData.attachments || []);
                }
            } else {
                Swal.fire('Lỗi', 'Không thể tải thông tin công việc', 'error');
                navigate(-1);
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchTaskData();
    }, [fetchTaskData]);

    // --- 2. ADMIN NỘP FILE MẪU / CHỮA CHÁY ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_id', id);

        try {
            const token = localStorage.getItem('my_token');
            const res = await fetch(`http://localhost:5000/api/attachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nộp file thành công', showConfirmButton: false, timer: 1500 });
                fetchTaskData(); 
            } else {
                const data = await res.json();
                Swal.fire('Lỗi', data.message || 'Không thể tải file lên', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
        } finally {
            setUploading(false);
            e.target.value = null; 
        }
    };

    // --- 3. TẢI FILE ---
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
                Swal.fire('Lỗi', data.message || 'Bạn không có quyền tải file này', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
        }
    };

    // --- 4. XÓA FILE (ĐẶC QUYỀN ADMIN) ---
    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({
            title: 'Xóa file này?',
            text: "File sẽ được đưa vào thùng rác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const res = await fetch(`http://localhost:5000/api/attachments/${fileId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa file', showConfirmButton: false, timer: 1500 });
                    setAttachments(prev => prev.filter(f => f.id !== fileId)); 
                } else {
                    const data = await res.json();
                    Swal.fire('Lỗi', data.message || 'Không thể xóa file', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
            }
        }
    };

    // --- 5. CẬP NHẬT TRẠNG THÁI CÔNG VIỆC ---
    const handleStatusChange = async (newStatus) => {
        if (task.status === newStatus) return;

        if (newStatus === 'completed' && attachments.length === 0) {
            Swal.fire('Khoan đã!', 'Công việc này chưa có file kết quả. Vui lòng nộp file trước khi chốt Hoàn thành.', 'warning');
            return;
        }

        try {
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đang cập nhật...', showConfirmButton: false, timer: 1000 });
            const token = localStorage.getItem('my_token');
            const res = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setTask({ ...task, status: newStatus });
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã lưu trạng thái', showConfirmButton: false, timer: 1500 });
            } else {
                const data = await res.json();
                Swal.fire('Lỗi', data.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Đang tải dữ liệu...</div>;
    if (!task) return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>❌ Không tìm thấy công việc!</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
            </button>

            <h2 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '24px' }}>{task.title}</h2>
            
            <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <p style={{ margin: '0 0 12px 0' }}><strong style={{ color: '#4B5563' }}>Mô tả:</strong> {task.description || 'Không có mô tả'}</p>
                <p style={{ margin: '0 0 16px 0' }}><strong style={{ color: '#4B5563' }}>Hạn chót:</strong> {new Date(task.due_date).toLocaleDateString('vi-VN')}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                    <strong style={{ color: '#4B5563' }}>Trạng thái:</strong>
                    <select 
                        value={task.status} 
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={task.status === 'completed' || task.status === 'cancelled'}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontWeight: '500', color: '#111827', minWidth: '150px' }}
                    >
                        <option value="pending">Chờ xử lý</option>
                        <option value="in_progress">Đang tiến hành</option>
                        <option value="completed">Đã hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #F1F5F9', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Tài liệu đính kèm ({attachments.length})</h3>
                
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div>
                        <input type="file" id="admin-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                        <label htmlFor="admin-upload-file" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {uploading ? 'Đang tải lên...' : 'Tải file lên'}
                        </label>
                    </div>
                )}
            </div>

            {attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#6B7280', border: '1px dashed #D1D5DB' }}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block', color: '#9CA3AF' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Chưa có tài liệu nào được nộp.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {attachments.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', transition: 'background-color 0.2s' }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                                    {file.file_type ? file.file_type.substring(0, 4).toUpperCase() : 'FILE'}
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#111827', fontSize: '15px' }}>{file.file_name}</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                                        {(file.file_size / 1024 / 1024).toFixed(2)} MB • Nộp bởi: <strong style={{ color: '#4B5563' }}>{file.uploaded_by_name || 'Hệ thống'}</strong>
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="btn-primary"
                                    onClick={() => handleDownload(file.id, file.file_name)} 
                                    style={{ padding: '8px 16px' }}
                                >
                                    Tải về
                                </button>
                                
                                <button 
                                    className="btn-primary"
                                    onClick={() => handleDeleteFile(file.id)} 
                                    style={{ padding: '8px 16px', backgroundColor: '#EF4444', borderColor: '#EF4444' }}
                                >
                                    Xóa
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AttachmentList;