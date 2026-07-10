import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddTask() {
    const { eventId: urlEventId } = useParams(); 
    const [searchParams] = useSearchParams();
    const eventIdFromQuery = searchParams.get('event_id');
    const navigate = useNavigate();

    const selectedEventId = urlEventId || eventIdFromQuery || '';
    const isEventLocked = Boolean(selectedEventId);
    const [eventId, setEventId] = useState(selectedEventId);
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('medium');
    const [taskType, setTaskType] = useState('preparation'); // Thêm task_type
    const [dueDate, setDueDate] = useState('');
    
    const [eventsList, setEventsList] = useState([]);
    const [membersList, setMembersList] = useState([]);
    const [loading, setLoading] = useState(false);

   useEffect(() => {
    document.title = "Thêm công việc mới | TaskFlow";
    const fetchEvents = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/events', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            
            if (response.ok) {
                const list = data.events || data || [];
                setEventsList(list);

                if (selectedEventId) {
                    const currentEvent = list.find(ev => String(ev.id) === String(selectedEventId));
                    
                    if (currentEvent && (currentEvent.status === 'Đã kết thúc' || currentEvent.status === 'Đã hủy')) {
                        Swal.fire({
                            title: 'Cảnh báo!',
                            text: 'Sự kiện này đã kết thúc hoặc bị hủy, không thể tạo thêm công việc mới.',
                            icon: 'warning',
                            confirmButtonText: 'Quay lại'
                        }).then(() => {
                            navigate(-1); 
                        });
                    }
                }
            }
        } catch (error) { 
            console.error(error); 
        }
    };
    fetchEvents();
}, [selectedEventId, navigate]); 

    const fetchEventMembers = async (id = selectedEventId) => {
        if (!id) {
            setMembersList([]);
            setAssignedTo('');
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/api/events/${id}/members`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            if (response.ok) setMembersList(data.members || []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        setEventId(selectedEventId);
        fetchEventMembers(selectedEventId);
    }, [selectedEventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!eventId || !title || !taskType) return Swal.fire('Lỗi', 'Vui lòng điền đủ trường bắt buộc!', 'warning');

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/tasks', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                // Bổ sung task_type vào body
                body: JSON.stringify({ 
                    event_id: eventId, 
                    title, 
                    description, 
                    assigned_to: assignedTo || null, 
                    priority, 
                    task_type: taskType, 
                    due_date: dueDate || null 
                })
            });

            if (response.ok) {
                Swal.fire('Thành công!', 'Tạo công việc thành công.', 'success').then(() => {
                    navigate(`/staff/events/view/${eventId}`);
                });
            } else {
                const data = await response.json();
                Swal.fire('Thất bại!', data.message, 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi hệ thống', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container event-page">
            <div className="page-header-form">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>
                <h3>Tạo công việc mới</h3>
            </div>
            <div className="form-card large">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Sự kiện <span className="text-error">*</span></label>
                                {isEventLocked ? (
                                    <div className="form-input" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }}>
                                        {eventsList.find(ev => String(ev.id) === String(eventId))?.title || 'Đang tải...'}
                                    </div>
                                ) : (
                                    <select className="form-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                                        <option value="">Chọn sự kiện</option>
                                        {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tên công việc <span className="text-error">*</span></label>
                                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả chi tiết</label>
                                <textarea className="form-input" rows="4" value={description} style={{ resize: 'vertical' }} onChange={(e) => setDescription(e.target.value)} />
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
                                    <option value="">Chọn nhân viên sự kiện</option>
                                    {membersList.map(m => <option key={m.user_id} value={m.user_id}>{m.user_id}.{m.full_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mức độ ưu tiên</label>
                                <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hạn chót</label>
                                <input type="datetime-local" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-neutral)' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Đang tạo...' : 'Lưu công việc'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTask;