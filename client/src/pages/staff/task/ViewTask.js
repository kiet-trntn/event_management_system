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

    // Form nộp bài của nhân viên
    const [submitContent, setSubmitContent] = useState('');
    const [submitLinkUrl, setSubmitLinkUrl] = useState('');
    const [submitFile, setSubmitFile] = useState(null);

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
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
        } finally { 
            setLoading(false); 
        }
    }, [id, navigate]);

    useEffect(() => { 
        document.title = "Chi tiết công việc | TaskFlow";
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
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã thêm tài liệu', showConfirmButton: false, timer: 1500 });
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

    const handleSubmitTaskResult = async (e) => {
        e.preventDefault();
        if (!submitContent && !submitLinkUrl && !submitFile) {
            return Swal.fire('Cảnh báo', 'Vui lòng cung cấp ít nhất một minh chứng (nội dung, link, hoặc file)!', 'warning');
        }

        const formData = new FormData();
        formData.append('task_id', id);
        formData.append('content', submitContent);
        formData.append('link_url', submitLinkUrl);
        if (submitFile) {
            formData.append('file', submitFile);
        }

        try {
            setUploading(true);
            const token = localStorage.getItem('my_token');
            const response = await fetch('http://localhost:5000/api/task-submissions', { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` }, 
                body: formData 
            });

            if (response.ok) {
                Swal.fire('Thành công', 'Đã nộp bài kết quả thành công! Vui lòng chờ Leader/Admin duyệt.', 'success');
                setSubmitContent('');
                setSubmitLinkUrl('');
                setSubmitFile(null);
                fetchTaskData();
            } else {
                const errData = await response.json();
                Swal.fire('Lỗi', errData.message || 'Không thể nộp bài', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleLeaderReview = async (status) => {
        if (!task.latest_submission_id) {
            Swal.fire('Lỗi', 'Không tìm thấy dữ liệu bài nộp. Có thể nhân viên chưa nộp.', 'error');
            return;
        }

        let review_note = "";
        if (status === 'rejected') {
            const { value: text } = await Swal.fire({
                title: 'Lý do từ chối bài nộp',
                input: 'textarea',
                inputPlaceholder: 'Nhập ghi chú yêu cầu nhân viên sửa đổi...',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Trả lại bài nộp',
                cancelButtonText: 'Hủy'
            });
            if (text === undefined) return;
            review_note = text;
        } else {
            const confirm = await Swal.fire({
                title: 'Xác nhận phê duyệt?',
                text: 'Duyệt bài nộp đồng nghĩa việc chốt Hoàn thành công việc.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Đồng ý duyệt'
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
                Swal.fire('Đã xử lý', status === 'approved' ? 'Công việc hoàn thành xuất sắc!' : 'Đã gửi phản hồi từ chối.', 'success');
                fetchTaskData();
            } else {
                const errData = await res.json();
                Swal.fire('Lỗi', errData.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
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
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                 <button className="btn-back" onClick={() => navigate(-1)}>
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

            <div className="task-view-wrapper" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* --- CỘT TRÁI: THÔNG TIN CHI TIẾT & TÀI LIỆU ĐÍNH KÈM --- */}
                <div className="form-card large" style={{ flex: '2 1 600px', margin: 0, padding: '24px' }}> 
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {task.title}
                        </h2>
                    </div>
                    
                    <div className="task-info-grid" style={{ marginBottom: '24px' }}>
                        <div className="task-grid-item">
                            <span className="task-grid-label">Người giao:</span>
                            <span className="badge-creator">{task.created_by_name || 'Hệ thống'}</span>
                        </div>
                        <div className="task-grid-item">
                            <span className="task-grid-label">Người thực hiện:</span>
                            <span className="badge-assignee">{task.assigned_name || 'Chưa phân công'}</span>
                        </div>
                        <div className="task-grid-item">
                            <span className="task-grid-label">Độ ưu tiên:</span>
                            {task.priority === 'high' ? <span className="badge-priority-high">Cao</span> : task.priority === 'medium' ? <span className="badge-priority-medium">Trung bình</span> : <span className="badge-priority-low">Thấp</span>}
                        </div>
                        <div className="task-grid-item">
                            <span className="task-grid-label">Hạn chót:</span>
                            <span className={task.due_date ? "badge-priority-high" : "badge-deadline-empty"}>
                                {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}
                            </span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 className="task-desc-title" style={{ marginBottom: '8px' }}>Mô tả chi tiết</h4>
                        <div className="task-desc-box" style={{ padding: '14px' }}>
                            {task.description || <span className="task-desc-empty">Không có mô tả chi tiết cho công việc này.</span>}
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Tài liệu đính kèm hệ thống ({attachments.length}):</h4>
                            {hasManagerRights && !isTaskClosed && (
                                <div>
                                    <input type="file" id="leader-upload-file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                    <label htmlFor="leader-upload-file" className="btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', padding: '8px 14px', margin: 0 }}>
                                        {uploading ? 'Đang tải...' : '+ Thêm tài liệu'}
                                    </label>
                                </div>
                            )}
                        </div>

                        {attachments.length === 0 ? (
                            <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '10px 0 0 0' }}>Chưa có file tài liệu vật lý nào được lưu trữ.</p>
                        ) : (
                            attachments.map(file => (
                                <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#F1F5F9', borderRadius: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{file.file_name}</span>
                                    <div style={{ display: 'flex', gap: '14px' }}>
                                        <button onClick={() => handleDownload(file.id, file.file_name)} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontWeight: 'bold' }}>Tải về</button>
                                        {hasManagerRights && (
                                            <button onClick={() => handleDeleteFile(file.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>Xóa</button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- CỘT PHẢI: PHÂN QUYỀN HIỂN THỊ MINH CHỨNG --- */}
                <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* TRƯỜNG HỢP 1: CHƯA HOÀN THÀNH VÀ LÀ NGƯỜI ĐƯỢC GIAO TASK -> Hiện form điền nộp bài hoặc box chờ duyệt */}
                    {!isTaskClosed && isAssignedUser && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <h3 style={{ fontSize: '18px', margin: '0 0 20px 0', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                Nộp minh chứng công việc
                            </h3>
                            <form onSubmit={handleSubmitTaskResult}>
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Tóm tắt nội dung hoàn thành:</label>
                                    <textarea 
                                        rows="3" 
                                        value={task.status === 'submitted' ? (task.submission_content || '') : submitContent} 
                                        onChange={(e) => setSubmitContent(e.target.value)} 
                                        disabled={task.status === 'submitted' || uploading}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: task.status === 'submitted' ? '#f1f5f9' : '#f8fafc', fontSize: '14px', outline: 'none' }} 
                                        placeholder="Ghi chú những việc đã làm..."
                                    ></textarea>
                                </div>

                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Link kết quả (Drive, GitHub,...):</label>
                                    {task.status === 'submitted' && task.submission_link_url ? (
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '14px' }}>
                                            <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                                                Link minh chứng đã nộp 
                                            </a>
                                        </div>
                                    ) : (
                                        <input 
                                            type="url" 
                                            value={submitLinkUrl} 
                                            onChange={(e) => setSubmitLinkUrl(e.target.value)} 
                                            disabled={task.status === 'submitted' || uploading}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', outline: 'none' }} 
                                            placeholder="https://..." 
                                        />
                                    )}
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Tệp báo cáo đính kèm:</label>
                                    <input type="file" id="file-upload" onChange={(e) => setSubmitFile(e.target.files[0])} disabled={task.status === 'submitted' || uploading} style={{ display: 'none' }} />
                                    <label 
                                        htmlFor={task.status === 'submitted' ? "" : "file-upload"} 
                                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', border: task.status === 'submitted' ? '1px solid #cbd5e1' : '1px dashed #94a3b8', borderRadius: '8px', backgroundColor: '#f1f5f9', cursor: task.status === 'submitted' ? 'default' : 'pointer', fontSize: '14px', color: '#334155', gap: '10px' }}
                                    >
                                        {task.status === 'submitted' ? (
                                            <span style={{ fontWeight: '500', color: '#0f172a' }}>
                                                {task.submission_file_name || "Không có tệp đính kèm"} 
                                                {task.submission_file_name && <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}><br/>(Sẽ đưa lên mục Tài liệu sau khi duyệt)</span>}
                                            </span>
                                        ) : submitFile ? (
                                            <span style={{ fontWeight: '500', color: '#0f172a' }}>{submitFile.name}</span>
                                        ) : (
                                            <span style={{ color: '#64748b' }}>Nhấn vào đây để chọn tệp báo cáo...</span>
                                        )}
                                    </label>
                                </div>

                                {task.status === 'submitted' ? (
                                    <button type="button" disabled style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'not-allowed' }}>
                                        Bài nộp đang chờ phê duyệt...
                                    </button>
                                ) : (
                                    <button type="submit" disabled={uploading} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
                                        {uploading ? 'Đang gửi...' : 'Gửi bài duyệt'}
                                    </button>
                                )}
                            </form>
                        </div>
                    )}

                    {/* TRƯỜNG HỢP 2: BÀI NỘP ĐANG CHỜ DUYỆT (Nhưng người đang xem lại là LEADER/ADMIN chứ không phải người thực hiện) -> Hiện thông tin minh chứng tĩnh và 2 nút Duyệt */}
                    {task.status === 'submitted' && !isAssignedUser && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <h3 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#b45309', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                Chi tiết minh chứng kết quả
                            </h3>
                            
                            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                <p style={{ margin: 0 }}><strong>Nội dung:</strong> {task.submission_content || 'Không có ghi chú.'}</p>
                                {task.submission_link_url && (
                                    <p style={{ margin: 0 }}>
                                        <strong>Đường dẫn (Link):</strong>{' '}
                                        <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600' }}>
                                            Xem sản phẩm nộp
                                        </a>
                                    </p>
                                )}
                                {task.submission_file_name && (
                                    <p style={{ margin: 0, color: '#475569', fontStyle: 'italic' }}>
                                        Đính kèm tệp vật lý: {task.submission_file_name} (Sẽ tự động đẩy vào mục Tài liệu đính kèm hệ thống sau khi bấm duyệt).
                                    </p>
                                )}
                            </div>

                            {isEventLeader && (
                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button onClick={() => handleLeaderReview('rejected')} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Trả lại</button>
                                    <button onClick={() => handleLeaderReview('approved')} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Duyệt Đạt</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TRƯỜNG HỢP 3: CÔNG VIỆC ĐÃ HOÀN THÀNH -> Xem lại text/link kết quả (Hiện cho tất cả mọi người xem) */}
                    {task.status === 'completed' && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', margin: '8px 0 4px 0', color: '#166534', fontWeight: '700' }}>Công việc hoàn thành</h3>
                                <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>Ghi nhận kết quả minh chứng thành công.</p>
                            </div>
                            
                            <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {task.submission_content && (
                                    <div>
                                        <strong style={{ color: '#166534', display: 'block', marginBottom: '4px' }}>Nội dung báo cáo:</strong>
                                        <span style={{ color: '#475569', whiteSpace: 'pre-wrap' }}>{task.submission_content}</span>
                                    </div>
                                )}
                                {task.submission_link_url && (
                                    <div>
                                        <strong style={{ color: '#166534', display: 'block', marginBottom: '4px' }}>Đường dẫn (Link):</strong>
                                        <a href={task.submission_link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: '600', wordBreak: 'break-all' }}>
                                            {task.submission_link_url} ↗
                                        </a>
                                    </div>
                                )}
                                {!task.submission_content && !task.submission_link_url && (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Báo cáo bằng tệp đính kèm vật lý (Xem ở mục Tài liệu).</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LỊCH SỬ HOẠT ĐỘNG */}
                    {(isAssignedUser || hasManagerRights) && (
                        <div className="form-card" style={{ margin: 0, padding: '24px', backgroundColor: 'var(--bg-neutral)', maxWidth: '100%' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Lịch sử hoạt động</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {taskHistory.map(h => (
                                    <p key={h.id} style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--text-primary)' }}><span style={{ fontWeight: '600' }}>{h.full_name}</span>: {translateAction(h.action)}</p>
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