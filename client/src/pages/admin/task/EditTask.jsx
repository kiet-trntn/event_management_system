import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditTask() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [eventId, setEventId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('medium');
    const [taskType, setTaskType] = useState('preparation');
    const [dueDate, setDueDate] = useState('');

    const [eventsList, setEventsList] = useState([]);
    const [membersList, setMembersList] = useState([]);
    
    const [loadingData, setLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const formatForDateTimeLocal = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); 
        return d.toISOString().slice(0, 16);
    };

    const translateRole = (role) => {
        if(role === 'coordinator') return 'Điều phối viên';
        if(role === 'member') return 'Thành viên';
        return role;
    };

    const fetchInitialData = useCallback(async () => {
        try {
            const evRes = await fetch('http://localhost:5000/api/events', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const evData = await evRes.json();
            if (evRes.ok) setEventsList(evData.events || evData || []);

            const taskRes = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const taskData = await taskRes.json();
            
            if (taskRes.ok) {
                // 🛑 BỔ SUNG CHẶN: Chặn sửa nếu bản thân task đã đóng HOẶC sự kiện cha đã bị kết thúc/hủy
                if (taskData.status === 'completed' || taskData.status === 'cancelled') {
                    Swal.fire('Cảnh báo', 'Không thể sửa công việc đã Đóng/Hủy', 'warning').then(() => navigate(-1));
                    return;
                }
                
                if (taskData.event_status === 'Đã kết thúc' || taskData.event_status === 'Đã hủy') {
                    Swal.fire('Cảnh báo', 'Sự kiện chứa công việc này đã đóng hoặc bị hủy, không cho phép chỉnh sửa!', 'warning').then(() => navigate(-1));
                    return;
                }

                setEventId(taskData.event_id || '');
                setTitle(taskData.title || '');
                setDescription(taskData.description || '');
                setAssignedTo(taskData.assigned_to || '');
                setPriority(taskData.priority || 'medium');
                setTaskType(taskData.task_type || 'preparation');
                setDueDate(formatForDateTimeLocal(taskData.due_date));
            } else {
                Swal.fire('Lỗi', 'Không tìm thấy công việc', 'error').then(() => navigate(-1));
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        document.title = "Sửa thông tin công việc | TaskFlow";
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!eventId) { setMembersList([]); return; }
        const fetchEventMembers = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                if (response.ok) setMembersList(data.members || []);
            } catch (error) { console.error(error); }
        };
        fetchEventMembers();
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!eventId || !title) return Swal.fire('Lỗi', 'Vui lòng điền đủ trường bắt buộc!', 'warning');

        setIsSaving(true);
        try {
            const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                body: JSON.stringify({ event_id: eventId, title, description, assigned_to: assignedTo || null, priority, task_type: taskType, due_date: dueDate || null })
            });

            if (response.ok) {
                Swal.fire('Thành công!', 'Cập nhật công việc thành công.', 'success').then(() => {
                    navigate(-1); 
                });
            } else {
                const data = await response.json();
                Swal.fire('Thất bại!', data.message || 'Không thể cập nhật', 'error');
            }
        } catch (error) { Swal.fire('Lỗi hệ thống!', 'Thử lại sau', 'error'); }
        finally { setIsSaving(false); }
    };

    if (loadingData) return <div className="text-center py-6 text-secondary">Đang tải dữ liệu...</div>;

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '800px' }}>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>
                <h3>Chỉnh sửa công việc</h3>
            </div>
            <div className="form-card large">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Sự kiện <span className="text-error">*</span></label>
                                <select className="form-input" value={eventId} onChange={(e) => { setEventId(e.target.value); setAssignedTo(''); }} disabled>
                                    {eventsList.map(ev => <option key={ev.id} value={ev.id}>[#{ev.id}] {ev.title}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tên công việc <span className="text-error">*</span></label>
                                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả chi tiết</label>
                                <textarea className="form-input" rows="5" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Giai đoạn <span className="text-error">*</span></label>
                                <select className="form-input" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                                    <option value="preparation">Chuẩn bị</option>
                                    <option value="during_event">Diễn ra</option>
                                    <option value="post_event">Kết thúc</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phân công cho</label>
                                <select className="form-input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                                    <option value="">-- Chưa giao cho ai --</option>
                                    {membersList.map(member => <option key={member.id} value={member.id}>#{member.id} - {member.full_name} ({translateRole(member.role_in_event)})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mức độ ưu tiên</label>
                                <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="low">🟢 Thấp</option><option value="medium">🟠 Trung bình</option><option value="high">🔴 Cao</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hạn chót</label>
                                <input type="datetime-local" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditTask;