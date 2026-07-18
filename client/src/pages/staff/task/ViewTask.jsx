import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]); 
    const [taskHistory, setTaskHistory] = useState([]);
    const [submissionHistory, setSubmissionHistory] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [submitContent, setSubmitContent] = useState('');
    const [submitLinkUrl, setSubmitLinkUrl] = useState('');
    const [submitFile, setSubmitFile] = useState(null);

    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) { 
                setCurrentUser(JSON.parse(window.atob(token.split('.')[1]))); 
            }
        } catch (e) { console.error("Lỗi giải mã token:", e); }
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
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
        } finally { setLoading(false); }
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

    const socketRef = useRef(null);

    useEffect(() => { 
        document.title = "Chi tiết công việc | TaskFlow";
        fetchTaskData(); 
        fetchSubmissionHistory(); 
    }, [fetchTaskData, fetchSubmissionHistory]);

    useEffect(() => {
        const token = localStorage.getItem('my_token');
        if (!token) return;
        socketRef.current = io('http://localhost:5000', { auth: { token } });
        socketRef.current.on('new_notification', (notif) => {
            try {
                if (!notif) return;
                if (Number(notif.related_id) === Number(id)) {
                    fetchTaskData();
                    fetchSubmissionHistory();
                }
            } catch (e) { }
        });
        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [id, fetchTaskData, fetchSubmissionHistory]);

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
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã thêm tài liệu', showConfirmButton: false, timer: 1500 });
                fetchTaskData(); 
            } else {
                const data = await res.json();
                Swal.fire('Lỗi', data.message || 'Không thể tải file lên', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
        finally { setUploading(false); e.target.value = null; }
    };

    const handleDeleteFile = async (fileId) => {
        const result = await Swal.fire({ title: 'Xóa file này?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Xóa' });
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const res = await fetch(`http://localhost:5000/api/attachments/${fileId}/deleted`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa file', showConfirmButton: false, timer: 1500 });
                    setAttachments(prev => prev.filter(f => f.id !== fileId)); 
                }
            } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
        }
    };

    const handleSubmitTaskResult = async (e) => {
        e.preventDefault();
        if (!submitContent && !submitLinkUrl && !submitFile) {
            return Swal.fire('Cảnh báo', 'Vui lòng cung cấp ít nhất một minh chứng!', 'warning');
        }
        const formData = new FormData();
        formData.append('task_id', id);
        formData.append('content', submitContent);
        formData.append('link_url', submitLinkUrl);
        if (submitFile) formData.append('file', submitFile);

        try {
            setUploading(true);
            const token = localStorage.getItem('my_token');
            const response = await fetch('http://localhost:5000/api/task-submissions', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (response.ok) {
                Swal.fire('Thành công', 'Đã nộp bài kết quả thành công!', 'success');
                setSubmitContent(''); setSubmitLinkUrl(''); setSubmitFile(null);
                fetchTaskData(); fetchSubmissionHistory(); 
            } else {
                const errData = await response.json(); Swal.fire('Lỗi', errData.message || 'Không thể nộp bài', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
        finally { setUploading(false); }
    };

    const handleLeaderReview = async (status) => {
        if (!task.latest_submission_id) return Swal.fire('Lỗi', 'Không tìm thấy dữ liệu bài nộp.', 'error');
        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({ title: 'Lý do từ chối bài nộp', input: 'textarea', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Trả lại' });
            if (text === undefined) return;
            review_note = text;
        } else {
            const confirm = await Swal.fire({ title: 'Xác nhận phê duyệt?', text: 'Duyệt bài nộp đồng nghĩa việc chốt Hoàn thành.', icon: 'question', showCancelButton: true });
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
                Swal.fire('Đã xử lý', status === 'approved' ? 'Công việc hoàn thành!' : 'Đã gửi phản hồi từ chối.', 'success');
                fetchTaskData(); fetchSubmissionHistory(); 
            } else {
                const errData = await res.json(); Swal.fire('Lỗi', errData.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error'); }
    };

    const handleReopenTask = async () => {
        const { value: note } = await Swal.fire({ title: 'Yêu cầu làm lại', input: 'textarea', inputPlaceholder: 'Nhập lý do làm lại...', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Gửi yêu cầu' });
        if (note) {
            try {
                const token = localStorage.getItem('my_token');
                const res = await fetch(`http://localhost:5000/api/task-submissions/${task.latest_submission_id}/reopen`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ review_note: note })
                });
                if (res.ok) {
                    Swal.fire('Thành công', 'Đã mở lại công việc cho nhân viên!', 'success'); fetchTaskData();
                } else {
                    const err = await res.json(); Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (e) { Swal.fire('Lỗi', 'Kết nối server', 'error'); }
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            const response = await fetch(`http://localhost:5000/api/attachments/${fileId}/download`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` } });
            if (response.ok) {
                const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
            }
        } catch (e) { console.error(e); }
    };

    const handleDownloadSubmission = async (subId, fileName) => {
        try {
            const token = localStorage.getItem('my_token');
            const res = await fetch(`http://localhost:5000/api/task-submissions/${subId}/download`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
            }
        } catch (err) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
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

    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">Đang tải dữ liệu...</div></div>;
    if (!task) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isEventLeader = currentUser && (Number(task.event_leader_id) === Number(currentUser.id)); 
    const isAssignedUser = currentUser && (task.assigned_to === currentUser.id);
    const hasManagerRights = isAdmin || isEventLeader;
    const isTaskClosed = task.status === 'completed' || task.status === 'cancelled';
    const isEventClosedOrCanceled = task.event_status === 'Đã kết thúc' || task.event_status === 'Đã hủy';
    const currentStatus = getStatusStyle(task.status);

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            <div className="page-header-form" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', maxWidth: '100%' }}>
                 <button className="btn-back" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#4b5563', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Quay lại
                 </button>   
                 
                {hasManagerRights && !isTaskClosed && !isEventClosedOrCanceled && (
                    <button className="btn-primary" onClick={() => navigate(`/staff/tasks/edit/${task.id}`)} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                        Chỉnh sửa công việc
                    </button>
                )}
            </div>

            {/* SỬA LẠI KHUNG HIỂN THỊ ĐỂ 2 CỘT ÔM SÁT NHAU */}
            <div className="task-view-wrapper" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* ===================== CỘT TRÁI (NỘI DUNG CHÍNH) ===================== */}
                <div style={{ flex: '1 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}> 
                    
                    <div className="form-card" style={{ margin: 0, padding: '30px', width: '100%', maxWidth: 'none', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                             <span style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {currentStatus.text}
                            </span>
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
                                {hasManagerRights && !isTaskClosed && !isEventClosedOrCanceled && (
                                    <div>
                                        <input type="file" id="leader-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                        <label htmlFor="leader-upload-file" style={{ cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '6px 12px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '6px', fontWeight: '600' }}>
                                            {uploading ? 'Đang tải...' : '+ Thêm tài liệu'}
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
                                            {hasManagerRights && !isEventClosedOrCanceled && (
                                                <button onClick={() => handleDeleteFile(file.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Xóa</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* BỔ SUNG LỊCH SỬ NỘP BÀI (VÀO CỘT TRÁI) */}
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
                {/* Cột phải giữ width cố định 360px */}
                <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* CẢNH BÁO ĐÓNG */}
                    {isEventClosedOrCanceled && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: 'none' }}>
                            <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '15px', margin: 0 }}>Sự kiện này đã đóng/hủy. Không thể nộp thêm minh chứng.</p>
                        </div>
                    )}

                    {/* BOX NỘP BÀI CỦA NHÂN VIÊN */}
                    {!isTaskClosed && isAssignedUser && !isEventClosedOrCanceled && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', width: '100%', maxWidth: 'none' }}>
                            <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Nộp minh chứng</h3>
                            <form onSubmit={handleSubmitTaskResult}>
                                <div style={{ marginBottom: '16px' }}>
                                    <textarea rows="3" value={task.status === 'submitted' ? (task.submission_content || '') : submitContent} onChange={(e) => setSubmitContent(e.target.value)} disabled={task.status === 'submitted' || uploading} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: task.status === 'submitted' ? '#f1f5f9' : '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} placeholder="Tóm tắt kết quả..."></textarea>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    {task.status === 'submitted' && task.submission_link_url ? (
                                        <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#f1f5f9', fontSize: '13px' }}><a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Link đã nộp</a></div>
                                    ) : (
                                        <input type="url" value={submitLinkUrl} onChange={(e) => setSubmitLinkUrl(e.target.value)} disabled={task.status === 'submitted' || uploading} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} placeholder="Link kết quả (tùy chọn)" />
                                    )}
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <input type="file" id="file-upload" onChange={(e) => setSubmitFile(e.target.files[0])} disabled={task.status === 'submitted' || uploading} style={{ display: 'none' }} />
                                    <label htmlFor={task.status === 'submitted' ? "" : "file-upload"} style={{ display: 'block', textAlign: 'center', padding: '10px', border: task.status === 'submitted' ? '1px solid #cbd5e1' : '1px dashed #94a3b8', borderRadius: '6px', backgroundColor: '#f8fafc', cursor: task.status === 'submitted' ? 'default' : 'pointer', fontSize: '13px', color: '#475569', boxSizing: 'border-box' }}>
                                        {task.status === 'submitted' ? (<span>{task.submission_file_name || "Không có tệp"}</span>) : submitFile ? (<span>{submitFile.name}</span>) : (<span>Đính kèm tệp...</span>)}
                                    </label>
                                </div>
                                {task.status === 'submitted' ? (
                                    <button type="button" disabled style={{ width: '100%', padding: '10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'not-allowed' }}>Đang chờ duyệt</button>
                                ) : (
                                    <button type="submit" disabled={uploading} style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>{uploading ? 'Đang gửi...' : 'Gửi bài nộp'}</button>
                                )}
                            </form>
                        </div>
                    )}

                    {/* BOX DUYỆT BÀI CỦA LEADER (Khi đã nộp) */}
                    {task.status === 'submitted' && isEventLeader && !isAssignedUser && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '12px', width: '100%', maxWidth: 'none' }}>
                            <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#b45309', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Duyệt bài nộp</h3>
                            <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', marginBottom: '16px' }}>
                                <p style={{ margin: '0 0 6px 0' }}><strong>Nội dung:</strong> {task.submission_content || 'Không có.'}</p>
                                {task.submission_link_url && (<p style={{ margin: '0 0 6px 0' }}><strong>Link:</strong> <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Xem</a></p>)}
                                {task.submission_file_name && (
                                    <button onClick={() => handleDownloadSubmission(task.latest_submission_id, task.submission_file_name)} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '6px' }}>Tải file về</button>
                                )}
                            </div>
                            
                            {!isEventClosedOrCanceled && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleLeaderReview('rejected')} style={{ flex: 1, padding: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Trả lại</button>
                                    <button onClick={() => handleLeaderReview('approved')} style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Duyệt Đạt</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOX HOÀN THÀNH VÀ NÚT YÊU CẦU LÀM LẠI ĐỎ CHÓT */}
                    {task.status === 'completed' && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', width: '100%', maxWidth: 'none' }}>
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', margin: '0 0 4px 0', color: '#166534', fontWeight: '700' }}>Công việc hoàn thành</h3>
                            </div>
                            <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {task.submission_content && (<div><strong style={{ color: '#166534', display: 'block' }}>Nội dung:</strong><span style={{ color: '#064e3b' }}>{task.submission_content}</span></div>)}
                                {task.submission_link_url && (<div><strong style={{ color: '#166534', display: 'block' }}>Link:</strong><a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Xem kết quả</a></div>)}
                            </div>

                            {hasManagerRights && !isEventClosedOrCanceled && (
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
                    {(isAssignedUser || hasManagerRights) && (
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
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskDetail;