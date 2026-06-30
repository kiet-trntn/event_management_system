import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AttachmentList() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

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
                setTask(await taskRes.json());
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

    const handleDownload = async (fileId, fileName) => {
        try {
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
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
        }
    };

    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({
            title: 'Xóa file này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const res = await fetch(`http://localhost:5000/api/attachments/${fileId}/deleted`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa file', showConfirmButton: false, timer: 1500 });
                    setAttachments(prev => prev.filter(f => f.id !== fileId)); 
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
            }
        }
    };

    const handleReviewSubmission = async (status) => {
        if (!task.latest_submission_id) return;
        
        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({
                title: 'Lý do từ chối bài nộp',
                input: 'textarea',
                inputPlaceholder: 'Nhập phản hồi...',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Từ chối'
            });
            if (text === undefined) return;
            review_note = text;
        } else {
            const confirm = await Swal.fire({ title: 'Xác nhận phê duyệt?', text: 'Công việc chuyển sang trạng thái Hoàn thành.', icon: 'question', showCancelButton: true });
            if (!confirm.isConfirmed) return;
        }

        try {
            const token = localStorage.getItem('my_token');
            const res = await fetch(`http://localhost:5000/api/task-submissions/${task.latest_submission_id}/review`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, review_note })
            });

            if (res.ok) {
                Swal.fire('Thành công', status === 'approved' ? 'Đã phê duyệt công việc!' : 'Đã từ chối.', 'success');
                fetchTaskData();
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
        }
    };

    // Hàm xuất Badge trạng thái có màu sắc đồng bộ
    // Thay thế hàm renderStatusBadge cũ bằng đoạn mã dưới đây:
const renderStatusBadge = (status) => {
    const badges = {
        pending: { label: 'Chờ xử lý', bg: '#f1f5f9', color: '#64748b' },
        in_progress: { label: 'Đang tiến hành', bg: '#eff6ff', color: '#2563eb' },
        submitted: { label: 'Chờ phê duyệt', bg: '#fff7ed', color: '#ea580c' }, // Đã chuẩn hóa
        completed: { label: 'Đã hoàn thành', bg: '#f0fdf4', color: '#166534' },
        cancelled: { label: 'Đã hủy', bg: '#fef2f2', color: '#dc2626' }
    };

    const current = badges[status] || { label: status, bg: '#f3f4f6', color: '#1f2937' };

    return (
        <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: current.bg,
            color: current.color
        }}>
            {current.label}
        </span>
    );
};

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải...</div>;
    if (!task) return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>Không tìm thấy công việc!</div>;

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '20px auto', padding: '24px' }}>
             <button className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    về chi tiết công việc
                 </button>  
            
            <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{task.title}</h2>
                    {/* Thay thế text thô bằng Badge màu sắc */}
                    {renderStatusBadge(task.status)}
                </div>

                {/* KHU VỰC MINH CHỨNG CHỜ DUYỆT */}
                {task.status === 'submitted' && (
                    <div style={{ padding: '20px', border: '2px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFFDFA', marginBottom: '32px' }}>
                        <h3 style={{ color: '#b45309', margin: '0 0 12px 0' }}>Chi tiết minh chứng kết quả</h3>
                        <p style={{ margin: '0 0 8px 0' }}><strong>Nội dung:</strong> {task.submission_content || 'Không có ghi chú.'}</p>
                        {task.submission_link_url && (
                            <p style={{ margin: '0 0 8px 0' }}>
                                <strong>Đường dẫn:</strong>{' '}
                                <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>
                                    {task.submission_link_url} ↗
                                </a>
                            </p>
                        )}
                        {task.submission_file_path && <p style={{ margin: 0, color: '#4b5563', fontStyle: 'italic' }}>Có file đính kèm đính kèm (Sẽ đưa vào danh sách dưới sau khi duyệt)</p>}
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                            <button onClick={() => handleReviewSubmission('rejected')} style={{ backgroundColor: '#EF4444', color: '#fff', padding: '8px 16px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Từ chối</button>
                            <button onClick={() => handleReviewSubmission('approved')} style={{ backgroundColor: '#10B981', color: '#fff', padding: '8px 16px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Phê duyệt</button>
                        </div>
                    </div>
                )}

                {/* THÔNG BÁO KHI ĐÃ DUYỆT XONG */}
                {task.status === 'completed' && (
                    <div style={{ padding: '20px', backgroundColor: '#F0FDF4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '32px' }}>
                        <div style={{ color: '#166534', fontWeight: '600', marginBottom: '10px' }}>
                            Công việc hoàn thành. Toàn bộ thông tin báo cáo đã được lưu trữ an toàn.
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {task.submission_content && <p style={{ margin: 0 }}><strong>Nội dung:</strong> {task.submission_content}</p>}
                            {task.submission_link_url && (
                                <p style={{ margin: 0 }}>
                                    <strong>Đường dẫn sản phẩm:</strong>{' '}
                                    <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>
                                        {task.submission_link_url} ↗
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* DANH SÁCH TÀI LIỆU VẬT LÝ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #F1F5F9', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Tài liệu đính kèm hệ thống ({attachments.length})</h3>
                    {task.status !== 'completed' && (
                        <label htmlFor="admin-upload-file" className="btn-primary" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '13px' }}>
                            {uploading ? 'Đang tải...' : 'Thêm file đính kèm'}
                            <input type="file" id="admin-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    )}
                </div>

                {attachments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                        Không có tệp tài liệu vật lý nào.
                    </div>
                ) : (
                    attachments.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '10px' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>{file.file_name}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleDownload(file.id, file.file_name)}>Tải về</button>
                                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#EF4444', borderColor: '#EF4444' }} onClick={() => handleDeleteFile(file.id)}>Xóa</button>
                            </div>
                        </div>
                    ))
                )}
            </div>  
        </div>
    );
}

export default AttachmentList;