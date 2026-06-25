import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchViewEvent = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [eventRes, tasksRes, membersRes] = await Promise.all([
                fetch(`http://localhost:5000/api/events/${id}`, { headers }),
                fetch(`http://localhost:5000/api/tasks`, { headers }),
                fetch(`http://localhost:5000/api/events/${id}/members`, { headers }).catch(() => null)
            ]);

            if (eventRes.ok && tasksRes.ok) {
                const eventData = await eventRes.json();
                const tasksData = await tasksRes.json();
                
                setEvent(eventData.event || eventData);
                
                const filteredTasks = (tasksData.tasks || []).filter(t => t.event_id.toString() === id);
                setTasks(filteredTasks);

                if (membersRes && membersRes.ok) {
                    const membersData = await membersRes.json();
                    setMembers(membersData.members || []);
                }
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu chi tiết', 'error');
                navigate('/staff/events');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchViewEvent();
    }, [fetchViewEvent]);

    const handleStatusChange = async (taskId, newStatus) => {
        const originalTask = tasks.find(t => t.id.toString() === taskId.toString());
        if (!originalTask || originalTask.status === newStatus) return;

        // --- LUẬT 1: KHÔNG CHO TỰ Ý HỦY ---
        if (newStatus === 'cancelled') {
            Swal.fire('Từ chối', 'Bạn không thể tự ý hủy công việc.', 'warning');
            // Reset lại UI về trạng thái cũ
            setTasks(prev => [...prev]); 
            return;
        }

        // --- LUẬT 2: KIỂM TRA FILE TRƯỚC KHI HOÀN THÀNH ---
        if (newStatus === 'completed') {
            Swal.fire({ title: 'Đang kiểm tra dữ liệu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const token = localStorage.getItem('my_token');
                const attachRes = await fetch(`http://localhost:5000/api/attachments/task/${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (attachRes.ok) {
                    const attachData = await attachRes.json();
                    if (!attachData.attachments || attachData.attachments.length === 0) {
                        Swal.fire('Chưa nộp file!', 'Vui lòng bấm vào công việc để nộp file kết quả trước khi đánh dấu hoàn thành!', 'warning');
                        // Reset lại UI về trạng thái cũ
                        setTasks(prev => [...prev]);
                        return; 
                    }
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Không thể kết nối để kiểm tra file.', 'error');
                setTasks(prev => [...prev]);
                return;
            }
        }

        try {
            const token = localStorage.getItem('my_token');
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Đang cập nhật...', showConfirmButton: false, timer: 1000 });

            const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Đã fix lỗi chuyển kiểu dữ liệu .toString() tại đây
                setTasks(prev => prev.map(t => t.id.toString() === taskId.toString() ? { ...t, status: newStatus } : t));
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã lưu trạng thái', showConfirmButton: false, timer: 1500 });
            } else {
                Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
                setTasks(prev => [...prev]);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error');
            setTasks(prev => [...prev]);
        }
    };

    const getSelectStyle = (status) => {
        switch(status) {
            case 'pending': return { color: 'var(--warning-color)', backgroundColor: '#FEF3C7', borderColor: '#FDE68A' };
            case 'in_progress': return { color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)', borderColor: '#BFDBFE' };
            case 'completed': return { color: 'var(--success-color)', backgroundColor: '#DCFCE7', borderColor: '#A7F3D0' };
            case 'cancelled': return { color: 'var(--text-secondary)', backgroundColor: '#F3F4F6', borderColor: 'var(--border-neutral)' };
            default: return {};
        }
    };

    if (loading) return <div className="page-container event-page"><div className="form-card text-center text-secondary">Đang tải chi tiết sự kiện...</div></div>;
    if (!event) return null;

    const leaderName = event.leader_name || 'Chưa cập nhật';

    return (
        <div className="page-container event-page">
            <button className="btn-back" onClick={() => navigate('/staff/events')}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
            </button>
            
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', marginTop: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '26px', fontWeight: 'normal', margin: 0, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                    {event.title}
                </h3>
                
                <span 
                    className={
                        event.status === 'Đã kết thúc' ? 'badge-pill badge-green' :
                        event.status === 'Đang diễn ra' ? 'badge-pill badge-blue' :
                        event.status === 'Đã hủy' ? 'badge-pill badge-gray' :
                        event.status === 'Nháp' ? 'badge-pill status-draft' : 'badge-pill badge-yellow'
                    } 
                    style={{ 
                        padding: '4px 12px', fontSize: '13px', fontWeight: 'normal',
                        display: 'inline-flex', alignItems: 'center', height: 'fit-content'
                    }}
                >
                    {event.status}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 65%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="form-card large" style={{ maxWidth: '100%', margin: 0 }}>
                        <h3 className="section-title">Mô tả sự kiện</h3>
                        <p className="text-secondary" style={{ lineHeight: '1.6', marginBottom: '16px' }}>
                            {event.description || 'Không có mô tả chi tiết cho sự kiện này.'}
                        </p>
                        <div className="event-divider"></div>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <div>
                                <strong>👑 Phụ trách: </strong> 
                                <span className="text-brand font-medium">{leaderName}</span>
                            </div>
                            <div>
                                <strong>📍 Địa điểm: </strong> 
                                {event.location}
                            </div>
                            
                            <div>
                                <strong>📅 Thời gian: </strong> 
                                {new Date(event.start_date).toLocaleDateString('vi-VN')} - {new Date(event.end_date).toLocaleDateString('vi-VN')}
                            </div>
                            
                        </div>
                    </div>

                    <div className="form-card large" style={{ maxWidth: '100%', margin: 0 }}>
                        <h3 className="section-title">Công việc của tôi ({tasks.length})</h3>
                        
                        {tasks.length === 0 ? (
                            <p className="text-center text-secondary" style={{ padding: '24px 0' }}>Chưa có công việc nào được phân công trong sự kiện này.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {tasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => navigate(`/staff/tasks/view/${task.id}`)}
                                        style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            padding: '16px 20px', border: '1px solid var(--border-neutral)', 
                                            borderRadius: '8px', backgroundColor: 'var(--bg-neutral)',
                                            cursor: 'pointer', transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>{task.title}</h4>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                Hạn chót: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}
                                            </p>
                                        </div>
                                        
                                        <select 
                                            className="form-input font-semibold" 
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                            disabled={task.status === 'completed' || task.status === 'cancelled'}
                                            style={{ width: 'auto', padding: '8px 16px', cursor: 'pointer', ...getSelectStyle(task.status) }}
                                        >
                                            <option value="pending">Chờ xử lý</option>
                                            <option value="in_progress">Đang tiến hành</option>
                                            <option value="completed">Đã hoàn thành</option>
                                            <option value="cancelled">Đã hủy</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: '1 1 28%', minWidth: '300px', margin: 0 }}>
                    
                    <div className="form-card" style={{ maxWidth: '100%', margin: 0, padding: '24px', height: 'fit-content' }}>
                        <h3 className="section-title">Thành viên tham gia ({members.length})</h3>
                        
                        {members.length === 0 ? (
                            <p className="text-secondary text-center" style={{ fontSize: '13px' }}>Chưa có thông tin thành viên.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {members.map((member, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>
                                            {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <p className="user-name" style={{ margin: 0 }}>{member.full_name}</p>
                                            <p className="user-role" style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                                                {member.role_in_event === 'coordinator' ? 'Điều phối viên' : 'Thành viên'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}

export default ViewEvent;