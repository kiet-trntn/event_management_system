import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewTask() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]); 
    const [attachments, setAttachments] = useState([]);
    const [submissionHistory, setSubmissionHistory] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchTaskDetail = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [taskRes, historyRes, attachRes, subRes] = await Promise.all([
                fetch(`http://localhost:5000/api/tasks/${id}`, { headers }),
                fetch(`http://localhost:5000/api/tasks/${id}/history`, { headers }).catch(() => null),
                fetch(`http://localhost:5000/api/attachments/task/${id}`, { headers }).catch(() => null),
                fetch(`http://localhost:5000/api/task-submissions/task/${id}`, { headers }).catch(() => null)
            ]);

            if (taskRes.ok) {
                setTask(await taskRes.json());
            } else {
                Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error').then(() => navigate('/admin/tasks'));
                return;
            }

            if (historyRes && historyRes.ok) setTaskHistory((await historyRes.json()).history || []);
            if (attachRes && attachRes.ok) setAttachments((await attachRes.json()).attachments || []);
            if (subRes && subRes.ok) setSubmissionHistory((await subRes.json()).submissions || []);

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

    const handleUpdateStatus = async (e) => {
        const newStatus = e.target.value;
        if (newStatus === 'completed' || newStatus === 'submitted') {
            return Swal.fire('Từ chối', 'Không thể đổi trực tiếp sang Hoàn thành/Chờ duyệt. Vui lòng duyệt bài nộp bên dưới!', 'warning');
        }
        try {
            const response = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã cập nhật trạng thái', showConfirmButton: false, timer: 1500 });
                fetchTaskDetail();
            } else {
                const data = await response.json();
                Swal.fire('Lỗi', data.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error'); }
    };

    const handleDelete = async () => { 
        const result = await Swal.fire({ title: 'Chuyển vào thùng rác?', text: "Công việc sẽ được chuyển vào thùng rác hệ thống.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#9ca3af', confirmButtonText: 'Đồng ý xóa' });
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` } });
                if (response.ok) { Swal.fire('Đã xóa', 'Công việc đã được chuyển vào thùng rác', 'success'); navigate('/admin/tasks'); } 
                else { Swal.fire('Lỗi', 'Không thể xóa công việc', 'error'); }
            } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_id', id);

        try {
            const res = await fetch(`http://localhost:5000/api/attachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                body: formData
            });
            if (res.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Thêm tài liệu thành công', showConfirmButton: false, timer: 1500 });
                fetchTaskDetail(); 
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
                const a = document.createElement('a'); a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
    };

    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({ title: 'Xóa file này?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Xóa' });
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

    const handleDownloadSubmission = async (subId, fileName) => {
        try {
            const res = await fetch(`http://localhost:5000/api/task-submissions/${subId}/download`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); a.remove();
            } else { Swal.fire('Lỗi', 'Không thể tải file', 'error'); }
        } catch (err) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
    };

    const handleReviewSubmission = async (status) => {
        if (!task.latest_submission_id) return;
        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({ title: 'Lý do từ chối bài nộp', input: 'textarea', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Từ chối' });
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
                fetchTaskDetail(); 
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error'); }
    };

    const handleReopenTask = async () => {
        const { value: note } = await Swal.fire({
            title: 'Yêu cầu làm lại', input: 'textarea', inputPlaceholder: 'Nhập lý do yêu cầu nhân viên làm lại...',
            showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Gửi yêu cầu'
        });

        if (note) {
            try {
                const res = await fetch(`http://localhost:5000/api/task-submissions/${task.latest_submission_id}/reopen`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                    body: JSON.stringify({ review_note: note })
                });
                if (res.ok) {
                    Swal.fire('Thành công', 'Đã mở lại công việc', 'success');
                    fetchTaskDetail(); 
                } else {
                    const err = await res.json(); Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (e) { Swal.fire('Lỗi', 'Kết nối server thất bại', 'error'); }
        }
    };

    const translateTaskType = (type) => {
        if(type === 'preparation') return 'Chuẩn bị'; if(type === 'during_event') return 'Diễn ra'; if(type === 'post_event') return 'Kết thúc'; return type || 'Khác';
    };

    const translateAction = (actionText) => {
        if (!actionText) return "";
        return actionText.replace('pending', 'Chờ xử lý').replace('in_progress', 'Đang tiến hành').replace('completed', 'Đã hoàn thành').replace('cancelled', 'Đã hủy');
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'completed': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã hoàn thành' };
            case 'in_progress': return { bg: '#dbeafe', color: '#2563eb', text: 'Đang tiến hành' };
            case 'cancelled': return { bg: '#fef2f2', color: '#dc2626', text: 'Đã hủy' };
            case 'submitted': return { bg: '#fff7ed', color: '#ea580c', text: 'Chờ phê duyệt' };
            default: return { bg: '#f1f5f9', color: '#64748b', text: 'Chờ xử lý' }; 
        }
    };

    if (loading) return <div className="page-container"><div className="text-center text-secondary">⏳ Đang tải chi tiết...</div></div>;
    if (!task) return null;

    const isEventClosedOrCanceled = task.event_status === 'Đã kết thúc' || task.event_status === 'Đã hủy';
    const isTaskLocked = task.status === 'completed' || task.status === 'cancelled' || task.status === 'submitted';
    const currentStatus = getStatusStyle(task.status);

    return (
        <div className="page-container task-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            <div className="page-header-form" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', maxWidth: '100%' }}>
                 <button className="btn-back" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#4b5563', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Quay lại
                 </button>   
                 
                {!isEventClosedOrCanceled && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleDelete} style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Xóa</button>
                        <button onClick={() => navigate(`/admin/tasks/edit/${task.id}`)} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Sửa công việc</button>
                    </div>
                )}
            </div>

            <div className="task-view-wrapper" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* ===================== CỘT TRÁI (THÔNG TIN CHUNG) ===================== */}
                <div style={{ flex: '1 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div className="form-card" style={{ margin: 0, padding: '30px', width: '100%', maxWidth: 'none', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {isEventClosedOrCanceled || isTaskLocked ? (
                                <span style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                    {currentStatus.text}
                                </span>
                            ) : (
                                <select 
                                    value={task.status} 
                                    onChange={handleUpdateStatus}
                                    style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', border: '1px solid transparent', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="pending" style={{ color: '#000' }}>Chờ xử lý</option>
                                    <option value="in_progress" style={{ color: '#000' }}>Đang tiến hành</option>
                                    <option value="cancelled" style={{ color: '#000' }}>Hủy công việc</option>
                                </select>
                            )}
                        </div>

                        <h2 style={{ fontSize: '28px', color: '#111827', margin: '0 0 24px 0', fontWeight: '700', letterSpacing: '-0.02em' }}>{task.title}</h2>

                        {/* ĐÃ FIX: LƯỚI THÔNG TIN SÁT RỊT NHAU */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '24px', fontSize: '14px' }}>
                            <div style={{ gridColumn: 'span 2', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Sự kiện:</span>
                                <span style={{ color: '#2563eb', fontWeight: '600' }}>{task.event_title}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Giai đoạn:</span>
                                <span style={{ color: '#334155' }}>{translateTaskType(task.task_type)}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Người giao:</span>
                                <span style={{ color: '#334155' }}>{task.created_by_name || 'Hệ thống'}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Người thực hiện:</span>
                                <span style={{ color: '#334155' }}>{task.assigned_name || 'Chưa phân công'}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Độ ưu tiên:</span>
                                <span style={{ color: '#334155' }}>{task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ fontWeight: '700', color: '#1e293b', marginRight: '8px' }}>Hạn chót:</span>
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '15px', color: '#111827', marginBottom: '8px', fontWeight: '600' }}>Mô tả chi tiết</h4>
                            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', minHeight: '80px' }}>
                                {task.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có mô tả.</span>}
                            </div>
                        </div>

                        {/* TÀI LIỆU HỆ THỐNG */}
                        <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Tài liệu đính kèm hệ thống ({attachments.length})</h4>
                                {!isEventClosedOrCanceled && (
                                    <div>
                                        <input type="file" id="admin-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                        <label htmlFor="admin-upload-file" style={{ cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '6px 12px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '6px', fontWeight: '600' }}>
                                            {uploading ? 'Đang tải...' : '+ Thêm file'}
                                        </label>
                                    </div>
                                )}
                            </div>
                            {attachments.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Chưa có file tài liệu vật lý nào được lưu trữ.</p>
                            ) : (
                                attachments.map(file => (
                                    <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#334155' }}>{file.file_name}</span>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button onClick={() => handleDownload(file.id, file.file_name)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Tải về</button>
                                            {!isEventClosedOrCanceled && (
                                                <button onClick={() => handleDeleteFile(file.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Xóa</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* LỊCH SỬ NỘP BÀI CỘT TRÁI */}
                        {submissionHistory.length > 0 && (
                            <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600' }}>Lịch sử minh chứng đã nộp</h4>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {submissionHistory.map(sub => (
                                        <div key={sub.id} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}><strong style={{ color: '#334155' }}>{sub.submitted_by_name}</strong> - {new Date(sub.created_at).toLocaleString('vi-VN')}</div>
                                            {sub.content && <div style={{ fontSize: '13px', color: '#1e293b' }}>{sub.content}</div>}
                                            {sub.link_url && (<div style={{ fontSize: '13px' }}><a href={sub.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{sub.link_url}</a></div>)}
                                            {sub.file_name && (<button onClick={() => handleDownloadSubmission(sub.id, sub.file_name)} style={{ alignSelf: 'flex-start', background: 'none', color: '#2563eb', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}>⬇ Tải file nộp</button>)}
                                            {sub.status === 'rejected' && (<div style={{ fontSize: '12px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '4px', marginTop: '4px' }}>Lý do từ chối: {sub.review_note}</div>)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===================== CỘT PHẢI (HÀNH ĐỘNG & LỊCH SỬ) ===================== */}
                <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* CẢNH BÁO ĐÓNG */}
                    {isEventClosedOrCanceled && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: 'none' }}>
                            <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '15px', margin: 0 }}>Sự kiện này đã đóng/hủy. Không thể nộp thêm minh chứng.</p>
                        </div>
                    )}

                    {/* BOX DUYỆT BÀI */}
                    {task.status === 'submitted' && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', border: '2px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: 'none' }}>
                            <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#b45309', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Duyệt minh chứng</h3>
                            <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', marginBottom: '16px' }}>
                                <p style={{ margin: '0 0 6px 0' }}><strong>Nội dung:</strong> {task.submission_content || 'Không có ghi chú.'}</p>
                                {task.submission_link_url && (<p style={{ margin: '0 0 6px 0' }}><strong>Link:</strong> <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Xem</a></p>)}
                                {task.submission_file_name && (
                                    <button onClick={() => handleDownloadSubmission(task.latest_submission_id, task.submission_file_name)} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '6px' }}>Tải file về</button>
                                )}
                            </div>
                            
                            {!isEventClosedOrCanceled && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleReviewSubmission('rejected')} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', padding: '10px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Từ chối</button>
                                    <button onClick={() => handleReviewSubmission('approved')} style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', padding: '10px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}>Phê duyệt</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOX HOÀN THÀNH */}
                    {task.status === 'completed' && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', width: '100%', maxWidth: 'none' }}>
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', margin: '0 0 4px 0', color: '#166534', fontWeight: '700' }}>Công việc hoàn thành</h3>
                            </div>
                            <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {task.submission_content && (<div><strong style={{ color: '#166534', display: 'block' }}>Nội dung:</strong><span style={{ color: '#064e3b' }}>{task.submission_content}</span></div>)}
                                {task.submission_link_url && (<div><strong style={{ color: '#166534', display: 'block' }}>Link:</strong><a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Xem kết quả</a></div>)}
                            </div>

                            {!isEventClosedOrCanceled && (
                                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                                    <button 
                                        onClick={handleReopenTask}
                                        style={{ padding: '10px 24px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', fontSize: '14px' }}
                                    >
                                        Yêu cầu làm lại
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LỊCH SỬ HOẠT ĐỘNG */}
                    <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: 'none' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Lịch sử hoạt động</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                            {taskHistory.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>Chưa có hoạt động nào.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px solid #e2e8f0', marginLeft: '6px', paddingLeft: '16px' }}>
                                    {taskHistory.map((history, index) => (
                                        <div key={history.id} style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '-23px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: index === 0 ? '#3b82f6' : '#cbd5e1' }}></div>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#1e293b', lineHeight: '1.4' }}><span style={{ fontWeight: '600' }}>{history.full_name}</span> {translateAction(history.action)}</p>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{new Date(history.created_at).toLocaleString('vi-VN')}</p>
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