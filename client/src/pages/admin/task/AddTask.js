import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddTask() {
    const navigate = useNavigate();

    const [eventId, setEventId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');

    const [eventsList, setEventsList] = useState([]);
    const [membersList, setMembersList] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const translateRole = (role) => {
            if(role === 'coordinator') return 'Điều phối viên';
            if(role === 'member') return 'Thành viên';
            return role;
        };

    useEffect(() => {
        document.title = "Thêm công việc mới | TaskFlow";
        const fetchEvents = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/events', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setEventsList(data.events || data || []);
                }
            } catch (error) {
                console.error("Lỗi tải sự kiện:", error);
            }
        };
        fetchEvents();
    }, []);

    useEffect(() => {
        if (!eventId) {
            setMembersList([]);
            setAssignedTo('');
            return;
        }

        const fetchEventMembers = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setMembersList(data.members || []);
                }
            } catch (error) {
                console.error("Lỗi tải thành viên:", error);
            }
        };
        
        fetchEventMembers();
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!eventId || !title) {
            Swal.fire('Lỗi', 'Vui lòng chọn sự kiện và nhập tên công việc!', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/tasks', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                body: JSON.stringify({
                    event_id: eventId,
                    title: title,
                    description: description,
                    assigned_to: assignedTo || null, 
                    priority: priority,
                    due_date: dueDate || null
                })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire('Thành công!', 'Tạo công việc thành công.', 'success').then(() => {
                    navigate('/admin/tasks'); 
                });
            } else {
                Swal.fire('Thất bại!', data.message || 'Không thể tạo công việc', 'error');
            }
        } catch (error) {
            console.error("Lỗi tạo task:", error);
            Swal.fire('Lỗi hệ thống!', 'Vui lòng thử lại sau', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container event-page">
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate('/admin/tasks')}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Về danh sách công việc
                </button>
                <h3>Tạo công việc mới</h3>
            </div>
            <div className="form-card large">
                <form onSubmit={handleSubmit}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Sự kiện <span className="text-error">*</span></label>
                                <select 
                                    className="form-input" 
                                    value={eventId}
                                    onChange={(e) => setEventId(e.target.value)}
                                >
                                    <option value="">Chọn sự kiện</option>
                                    {eventsList.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.id}. {ev.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tên công việc <span className="text-error">*</span></label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="VD: Liên hệ nhà tài trợ..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mô tả chi tiết</label>
                                <textarea 
                                    className="form-input" 
                                    rows="4" 
                                    placeholder="Ghi chú thêm về công việc này..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="form-group">
                                <label className="form-label">Phân công cho</label>
                                <select 
                                    className="form-input" 
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    disabled={!eventId} 
                                    style={{ backgroundColor: !eventId ? '#f3f4f6' : '#fff' }}
                                >
                                    {!eventId ? (
                                        <option value="">Vui lòng chọn sự kiện trước</option>
                                    ) : (
                                        <>
                                            <option value="">Chọn người được phân công</option>
                                            {membersList.map(member => (
                                                <option key={member.id} value={member.id}>
                                                    {member.id}. {member.full_name} ({translateRole(member.role_in_event)})
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mức độ ưu tiên</label>
                                <select 
                                    className="form-input" 
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="low">Thấp</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="high">Cao</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Hạn chót (Deadline)</label>
                                <input 
                                    type="datetime-local" 
                                    className="form-input" 
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-neutral)' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/tasks')}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Đang tạo...' : 'Lưu công việc'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTask;