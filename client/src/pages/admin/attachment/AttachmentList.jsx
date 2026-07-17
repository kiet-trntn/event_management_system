import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AttachmentList() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [submissionHistory, setSubmissionHistory] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [eventStatus, setEventStatus] = useState('');
    
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) {
                setCurrentUser(JSON.parse(window.atob(token.split('.')[1])));
            }
        } catch (e) { console.error(e); }
    }, []);

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
                    setEventStatus(attachData.event_status || '');
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

    const fetchSubmissionHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem('my_token');
            const res = await fetch(`http://localhost:5000/api/task-submissions/task/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissionHistory(data.submissions || []);
            }
        } catch (err) { console.error("Lỗi tải lịch sử bài nộp:", err); }
    }, [id]);

    useEffect(() => {
        fetchTaskData();
        fetchSubmissionHistory(); 
    }, [fetchTaskData, fetchSubmissionHistory]);

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
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); } 
        finally { setUploading(false); e.target.value = null; }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            const response = await fetch(`http://localhost:5000/api/attachments/${fileId}/download`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
    };

    const handleDownloadSubmission = async (subId, fileName) => {
        try {
            const res = await fetch(`http://localhost:5000/api/task-submissions/${subId}/download`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); a.remove();
            } else { Swal.fire('Lỗi', 'Không thể tải file', 'error'); }
        } catch (err) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
    };

    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({ title: 'Xóa file này?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Xóa ngay', cancelButtonText: 'Hủy' });
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:5000/api/attachments/${fileId}/deleted`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa file', showConfirmButton: false, timer: 1500 });
                    setAttachments(prev => prev.filter(f => f.id !== fileId)); 
                }
            } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
        }
    };

    const handleReviewSubmission = async (status) => {
        if (!task.latest_submission_id) return;
        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({ title: 'Lý do từ chối bài nộp', input: 'textarea', inputPlaceholder: 'Nhập phản hồi...', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Từ chối' });
            if (text === undefined) return;
            review_note = text;
        } else {
            const confirm = await Swal.fire({ title: 'Xác nhận phê duyệt?', text: 'Công việc chuyển sang trạng thái Hoàn thành.', icon: 'question', showCancelButton: true });
            if (!confirm.isConfirmed) return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/task-submissions/${task.latest_submission_id}/review`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                body: JSON.stringify({ status, review_note })
            });
            if (res.ok) {
                Swal.fire('Thành công', status === 'approved' ? 'Đã phê duyệt công việc!' : 'Đã từ chối.', 'success');
                fetchTaskData(); fetchSubmissionHistory(); 
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error'); }
    };

    // 🔥 HÀM YÊU CẦU LÀM LẠI CHO QUẢN LÝ
    const handleReopenTask = async () => {
        const { value: note } = await Swal.fire({
            title: 'Yêu cầu làm lại',
            input: 'textarea',
            inputPlaceholder: 'Nhập lý do yêu cầu nhân viên làm lại...',
            showCancelButton: true,
            confirmButtonColor: '#d97706',
            confirmButtonText: 'Gửi yêu cầu'
        });

        if (note) {
            try {
                const res = await fetch(`http://localhost:5000/api/task-submissions/${task.latest_submission_id}/reopen`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                    body: JSON.stringify({ review_note: note })
                });
                if (res.ok) {
                    Swal.fire('Thành công', 'Đã mở lại công việc cho nhân viên!', 'success');
                    fetchTaskData();
                } else {
                    const err = await res.json();
                    Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (e) { Swal.fire('Lỗi', 'Kết nối server thất bại', 'error'); }
        }
    };

    const renderStatusBadge = (status) => {
        const badges = {
            pending: { label: 'Chờ xử lý', bg: '#f1f5f9', color: '#64748b' },
            in_progress: { label: 'Đang tiến hành', bg: '#eff6ff', color: '#2563eb' },
            submitted: { label: 'Chờ phê duyệt', bg: '#fff7ed', color: '#ea580c' },
            completed: { label: 'Đã hoàn thành', bg: '#f0fdf4', color: '#166534' },
            cancelled: { label: 'Đã hủy', bg: '#fef2f2', color: '#dc2626' }
        };
        const current = badges[status] || { label: status, bg: '#f3f4f6', color: '#1f2937' };
        return <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: '600', backgroundColor: current.bg, color: current.color }}>{current.label}</span>;
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải...</div>;
    if (!task) return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>Không tìm thấy công việc!</div>;

    const isEventClosedOrCanceled = eventStatus === 'Đã kết thúc' || eventStatus === 'Đã hủy';
    const hasManagerRights = currentUser && (currentUser.role === 'admin' || Number(task.event_leader_id) === Number(currentUser.id));

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '20px auto', padding: '24px' }}>
             <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#4b5563', fontWeight: '500' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Về chi tiết công việc
             </button>  
            
            <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {isEventClosedOrCanceled && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fdf2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
                        Sự kiện chứa công việc này đã {eventStatus.toLowerCase()}. Hồ sơ minh chứng và tài liệu đính kèm đã bị khóa cứng ở chế độ chỉ đọc.
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{task.title}</h2>
                    {renderStatusBadge(task.status)}
                </div>

                {task.status === 'submitted' && (
                    <div style={{ padding: '20px', border: '2px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFFDFA', marginBottom: '32px' }}>
                        <h3 style={{ color: '#b45309', margin: '0 0 12px 0' }}>Chi tiết minh chứng kết quả</h3>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Nội dung:</strong> {task.submission_content || 'Không có ghi chú.'}</p>
                        {task.submission_link_url && (
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Đường dẫn:</strong> <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>{task.submission_link_url}</a></p>
                        )}
                        {(task.submission_file_name || task.submission_file_path) && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ margin: 0, color: '#4b5563', fontStyle: 'italic', fontSize: '14px' }}>Đính kèm tệp vật lý: {task.submission_file_name || 'Có file đính kèm'}</p>
                                <button onClick={() => handleDownloadSubmission(task.latest_submission_id, task.submission_file_name || 'minh-chung.pdf')} style={{ alignSelf: 'flex-start', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Tải file về xem trước</button>
                            </div>
                        )}
                        {!isEventClosedOrCanceled && hasManagerRights && (
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                                <button onClick={() => handleReviewSubmission('rejected')} style={{ backgroundColor: '#EF4444', color: '#fff', padding: '8px 16px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Từ chối</button>
                                <button onClick={() => handleReviewSubmission('approved')} style={{ backgroundColor: '#10B981', color: '#fff', padding: '8px 16px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Phê duyệt</button>
                            </div>
                        )}
                    </div>
                )}

                {task.status === 'completed' && (
                    <div style={{ padding: '20px', backgroundColor: '#F0FDF4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '32px' }}>
                        <div style={{ color: '#166534', fontWeight: '600', marginBottom: '10px' }}>
                            Công việc hoàn thành. Toàn bộ thông tin báo cáo đã được lưu trữ an toàn.
                        </div>

                        {/* NỘI DUNG Ở TRÊN */}
                        <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {task.submission_content && <p style={{ margin: 0 }}><strong>Nội dung:</strong> {task.submission_content}</p>}
                            {task.submission_link_url && (
                                <p style={{ margin: 0 }}><strong>Đường dẫn sản phẩm:</strong> <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>{task.submission_link_url} ↗</a></p>
                            )}
                        </div>
                        
                        {/* NÚT YÊU CẦU LÀM LẠI Ở DƯỚI (Ngăn cách rõ ràng) */}
                        {hasManagerRights && !isEventClosedOrCanceled && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #bbf7d0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={handleReopenTask}
                                    style={{ padding: '8px 16px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    Yêu cầu làm lại
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', borderBottom: '2px solid #F1F5F9', paddingBottom: '8px' }}>Lịch sử minh chứng đã nộp</h3>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {submissionHistory.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' }}>Chưa có bài nộp nào.</p>
                        ) : (
                            submissionHistory.map(sub => (
                                <div key={sub.id} style={{ borderBottom: '1px solid #E5E7EB', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}><strong style={{ color: '#374151' }}>{sub.submitted_by_name}</strong> - {new Date(sub.created_at).toLocaleString('vi-VN')}</div>
                                    {sub.content && <div style={{ fontSize: '14px', color: '#4b5563' }}>{sub.content}</div>}
                                    {sub.link_url && (<div style={{ fontSize: '13px' }}><strong>Link kết quả:</strong> <a href={sub.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '500' }}>{sub.link_url}</a></div>)}
                                    {sub.file_name && (<button onClick={() => handleDownloadSubmission(sub.id, sub.file_name)} style={{ alignSelf: 'flex-start', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>⬇ Tải file: {sub.file_name}</button>)}
                                    {sub.status === 'rejected' && (<div style={{ fontSize: '13px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '4px', marginTop: '4px', borderLeft: '3px solid #ef4444' }}>Từ chối: {sub.review_note}</div>)}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #F1F5F9', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Tài liệu đính kèm hệ thống ({attachments.length})</h3>
                    {task.status !== 'completed' && !isEventClosedOrCanceled && hasManagerRights && (
                        <label htmlFor="admin-upload-file" className="btn-primary" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '13px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px' }}>
                            {uploading ? 'Đang tải...' : 'Thêm file đính kèm'}
                            <input type="file" id="admin-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    )}
                </div>

                {attachments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>Không có tệp tài liệu vật lý nào.</div>
                ) : (
                    attachments.map(file => (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '10px' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>{file.file_name}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }} onClick={() => handleDownload(file.id, file.file_name)}>Tải về</button>
                                {!isEventClosedOrCanceled && hasManagerRights && (
                                    <button style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }} onClick={() => handleDeleteFile(file.id)}>Xóa</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>  
        </div>
    );
}

export default AttachmentList;