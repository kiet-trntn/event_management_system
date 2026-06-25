import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskDetail() {
    const { id } = useParams();
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
            // Hiện thông báo đang tải...
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đang chuẩn bị file...', showConfirmButton: false, timer: 1500 });
            
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/attachments/${fileId}/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                // Nhận dữ liệu file (blob) và tạo đường dẫn ảo để tự động tải xuống
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName; // Lấy tên file gốc
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url); // Dọn rác
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
                } else {
                    Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
            }
        }
    };

    // --- 4. GIAO DIỆN ---
    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;
    if (!task) return null;

    return (
        <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#4f46e5', fontWeight: '600' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Quay lại
            </button>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* --- CỘT TRÁI: THÔNG TIN CÔNG VIỆC --- */}
                <div className="form-card" style={{ flex: '2 1 500px', margin: 0, padding: '24px' }}>
    
    {/* Tiêu đề công việc */}
    <h2 style={{ fontSize: '26px', margin: '0 0 8px 0', color: '#111827', fontWeight: '700' }}>
        {task.title}
    </h2>
    
    {/* Tên sự kiện nằm dưới */}
    <p style={{ margin: '0 0 24px 0', fontSize: '15px' }}>
        <span style={{ color: '#6b7280' }}>Sự kiện: </span>
        <span style={{ color: '#3b82f6' }}>{task.event_title}</span>
    </p>
    
    {/* Phần thông tin (Đã bỏ nền xám, dùng icon và xếp thành 2 dòng giống ảnh) */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#374151' }}>
        
        {/* Dòng 1: Người giao và Độ ưu tiên */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <div>
                👑 <strong style={{ color: '#4b5563' }}>Người giao: </strong> 
                <span style={{ color: '#2563eb' }}>{task.created_by_name}</span>
            </div>
            
            <div>
                📍 <strong style={{ color: '#4b5563' }}>Độ ưu tiên: </strong> 
                {task.priority === 'high' ? <span style={{color: '#dc2626', fontWeight: '600'}}>Cao</span> : task.priority === 'medium' ? <span style={{color: '#d97706', fontWeight: '600'}}>Trung bình</span> : 'Thấp'}
            </div>
        </div>
        
        {/* Dòng 2: Hạn chót */}
        <div>
            📅 <strong style={{ color: '#4b5563' }}>Hạn chót: </strong> 
            {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}
        </div>
        
    </div>

    {/* Mô tả chi tiết (Thêm gạch dọc màu xanh cho giống ảnh, bỏ nền xám) */}
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

                {/* --- CỘT PHẢI: KHU VỰC NỘP FILE --- */}
                <div className="form-card" style={{ flex: '1 1 300px', margin: 0, padding: '24px', backgroundColor: '#ffffff' }}>
                    
                    <h3 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Tệp đính kèm
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px', padding: '2px 8px', borderRadius: '12px' }}>
                            {attachments.length} file
                        </span>
                    </h3>

                    {/* Nút Upload File */}
                    {task.status !== 'completed' && task.status !== 'cancelled' ? (
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
                    )}

                    {/* Danh sách file */}
                    {attachments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Chưa có tệp nào được tải lên.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {attachments.map(file => (
                                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                        {file.file_type.substring(0, 4).toUpperCase()}
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

                    {/* Nút Chốt Hoàn Thành */}
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
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

            </div>
        </div>
    );
}

export default TaskDetail;