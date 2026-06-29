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
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đang tải file...', showConfirmButton: false, timer: 1000 });
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
                Swal.fire('Lỗi', 'Bạn không có quyền tải file này', 'error');
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
                const res = await fetch(`http://localhost:5000/api/attachments/${fileId}`, {
                    method: 'DELETE',
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

    // ADMIN DUYỆT BÀI NỘP
    const handleReviewSubmission = async (status) => {
        if (!task.latest_submission_id) {
            Swal.fire('Lỗi', 'Không tìm thấy dữ liệu bài nộp. Có thể nhân viên chưa nộp qua hệ thống.', 'error');
            return;
        }

        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({
                title: 'Lý do từ chối bài nộp',
                input: 'textarea',
                inputPlaceholder: 'Nhập nội dung phản hồi cho nhân viên sửa lại...',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Từ chối',
                cancelButtonText: 'Hủy'
            });
            if (text === undefined) return;
            review_note = text;
        } else {
            const confirm = await Swal.fire({
                title: 'Xác nhận phê duyệt?',
                text: 'Công việc này sẽ chuyển sang trạng thái Hoàn thành và công bố.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Duyệt đạt'
            });
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
                Swal.fire('Thành công', status === 'approved' ? 'Đã phê duyệt công việc!' : 'Đã từ chối bài nộp.', 'success');
                fetchTaskData();
            } else {
                const data = await res.json();
                Swal.fire('Lỗi', data.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>;
    if (!task) return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>Không tìm thấy công việc!</div>;

    const getStatusStyles = (status) => {
        const styles = {
            pending: { color: '#64748b' },      // Xám
            in_progress: { color: '#3b82f6' },  // Xanh dương
            submitted: { color: '#f59e0b' },    // Vàng cam
            completed: { color: '#10b981' },    // Xanh lá
            cancelled: { color: '#ef4444' }     // Đỏ
        };
        return styles[status] || { color: '#111827' };
    };
    const statusLabels = {
        pending: 'Đang chờ',
        in_progress: 'Đang thực hiện',
        submitted: 'Đã nộp',
        completed: 'Đã hoàn thành',
        cancelled: 'Đã hủy'
    };

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '20px auto', padding: '24px' }}>
        <button className="btn-back" onClick={() => navigate(-1)}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
        </button>    
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '24px' }}>{task.title}</h2>
            
            <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <p style={{ margin: '0 0 12px 0' }}><strong style={{ color: '#4B5563' }}>Mô tả:</strong> {task.description || 'Không có mô tả'}</p>
                <p style={{ margin: '0 0 12px 0' }}><strong style={{ color: '#4B5563' }}>Hạn chót:</strong> {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#4B5563' }}>Trạng thái hệ thống: </strong> 
                    <span style={{ fontWeight: 'bold', ...getStatusStyles(task.status) }}>
                     {statusLabels[task.status] || task.status}
                    </span>                
                </p>
            </div>

            {/* KHU VỰC HIỂN THỊ BÀI NỘP CHỜ DUYỆT */}
            {(task.status === 'submitted' || task.status === 'completed') && (
                <div style={{ padding: '20px', border: '2px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFFDFA', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#B45309' }}>Chi tiết minh chứng kết quả nộp bài</h3>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Nội dung văn bản:</strong>
                        <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                            {task.submission_content || 'Không có nội dung ghi chú.'}
                        </div>
                    </div>

                    {task.submission_link_url && (
                        <div style={{ marginBottom: '12px' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Đường dẫn sản phẩm:</strong>
                            <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline', fontWeight: '500' }}>
                                {task.submission_link_url}
                            </a>
                        </div>
                    )}

                    {task.submission_file_path && (
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                            <strong>File minh chứng:</strong>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={task.submission_file_name}>{task.submission_file_name}</span>
                            <button className="btn-primary" onClick={() => handleDownload(task.submission_file_id, task.submission_file_name)} style={{ padding: '6px 12px', fontSize: '13px' }}>Tải file</button>
                        </div>
                    )}

                    {task.status === 'submitted' && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                            <button onClick={() => handleReviewSubmission('rejected')} style={{ backgroundColor: '#EF4444', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Từ chối</button>
                            <button onClick={() => handleReviewSubmission('approved')} style={{ backgroundColor: '#10B981', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Phê duyệt (Công bố)</button>
                        </div>
                    )}
                </div>
            )}

            {/* KHU VỰC TÀI LIỆU MẪU */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #F1F5F9', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Tài liệu mẫu đính kèm ({attachments.length})</h3>
                
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div>
                        <input type="file" id="admin-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                        <label htmlFor="admin-upload-file" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                            {uploading ? 'Đang tải lên...' : 'Thêm file mẫu'}
                        </label>
                    </div>
                )}
            </div>

            {attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#6B7280', border: '1px dashed #D1D5DB' }}>
                    Chưa có tài liệu mẫu nào.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {attachments.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                            <div>
                                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#111827', fontSize: '15px' }}>{file.file_name}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-primary" onClick={() => handleDownload(file.id, file.file_name)} style={{ padding: '8px 16px' }}>Tải về</button>
                                <button className="btn-primary" onClick={() => handleDeleteFile(file.id)} style={{ padding: '8px 16px', backgroundColor: '#EF4444', borderColor: '#EF4444' }}>Xóa</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>  
        </div>
    );
}

export default AttachmentList;