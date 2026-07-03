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
    const [currentUser, setCurrentUser] = useState(null); 

    // --- CÁC BỘ LỌC CÔNG VIỆC TRONG SỰ KIỆN TỐI ĐA ---
    const [filterTaskStatus, setFilterTaskStatus] = useState('');
    const [filterTaskPriority, setFilterTaskPriority] = useState('');
    const [filterTaskFromDate, setFilterTaskFromDate] = useState('');
    const [filterTaskToDate, setFilterTaskToDate] = useState('');

    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setCurrentUser(payload);
            }
        } catch (error) {
            console.error("Lỗi giải mã token:", error);
        }
    }, []);

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
                
                const filteredTasks = (tasksData.tasks || []).filter(t => t.event_id.toString() === id && !t.is_deleted);
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

    const handleDeleteTask = async (e, taskId) => {
        e.stopPropagation(); 
        
        const result = await Swal.fire({
            title: 'Xóa công việc này?',
            text: "Công việc sẽ được chuyển vào Thùng rác hệ thống.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                if (response.ok) {
                    Swal.fire('Thành công!', 'Công việc đã được chuyển vào Thùng rác.', 'success');
                    fetchViewEvent(); 
                } else {
                    const data = await response.json();
                    Swal.fire('Thất bại!', data.message || 'Không thể xóa công việc', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Mất kết nối server', 'error');
            }
        }
    };

    const handleRemoveMember = async (userId) => {
        const result = await Swal.fire({
            title: 'Loại bỏ thành viên?',
            text: "Nhân viên này sẽ bị loại hoàn toàn khỏi danh sách sự kiện.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xác nhận loại',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/members/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã xóa thành viên khỏi sự kiện.', 'success');
                    fetchViewEvent();
                } else {
                    const data = await response.json();
                    Swal.fire('Thất bại!', data.message || 'Không thể xóa thành viên', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Mất kết nối server', 'error');
            }
        }
    };

    const handleResetFilter = () => {
        setFilterTaskStatus('');
        setFilterTaskPriority('');
        setFilterTaskFromDate('');
        setFilterTaskToDate('');
    };

    const getSelectStyle = (status) => {
        const styles = {
            'pending': { color: '#64748b', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
            'in_progress': { color: '#2563eb', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
            'submitted': { color: '#ea580c', backgroundColor: '#fff7ed', borderColor: '#ffedd5' }, 
            'completed': { color: '#166534', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
            'cancelled': { color: '#dc2626', backgroundColor: '#fef2f2', borderColor: '#fecaca' }
        };
        return styles[status] || {};
    };

    const renderTaskStatusText = (status) => {
        if (status === 'pending') return 'Chờ xử lý';
        if (status === 'in_progress') return 'Đang tiến hành';
        if (status === 'submitted') return 'Chờ phê duyệt'; 
        if (status === 'completed') return 'Đã hoàn thành';
        return 'Đã hủy';
    };

    const getPriorityIcon = (priority) => {
        switch(priority) {
            case 'high': return <span style={{ color: '#ef4444' }}>Cao</span>;
            case 'medium': return <span style={{ color: '#f59e0b' }}>Trung Bình</span>;
            case 'low': return <span style={{ color: '#10b981' }}>Thấp</span>;
            default: return '';
        }
    };

    if (loading) return <div className="page-container event-page"><div className="form-card text-center text-secondary">Đang tải chi tiết sự kiện...</div></div>;
    if (!event) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isLeader = currentUser && event && (Number(event.leader_id) === Number(currentUser.id));
    const hasManagerRights = isAdmin || isLeader; 

    const leaderName = event.leader_name || 'Chưa cập nhật';

    const formatDateTime = (value) => {
        if (!value) return 'Không xác định';
        return new Date(value).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // --- LỌC CÔNG VIỆC NHIỀU ĐIỀU KIỆN TẠI FRONTEND ---
    const displayTasks = tasks.filter(t => {
        const matchStatus = filterTaskStatus ? t.status === filterTaskStatus : true;
        const matchPriority = filterTaskPriority ? t.priority === filterTaskPriority : true;
        
        let matchFromDate = true;
        let matchToDate = true;

        if (filterTaskFromDate) {
            matchFromDate = t.due_date ? new Date(t.due_date) >= new Date(filterTaskFromDate) : false;
        }
        if (filterTaskToDate) {
            matchToDate = t.due_date ? new Date(t.due_date) <= new Date(filterTaskToDate) : false;
        }

        return matchStatus && matchPriority && matchFromDate && matchToDate;
    });

    return (
        <div className="page-container event-page">
            <button className="btn-back" onClick={() => navigate('/staff/events')}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
            </button>
            
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '26px', margin: 0, color: 'var(--text-primary)', lineHeight: '1.2' }}>{event.title}</h3>
                    <span className={event.status === 'Đã kết thúc' ? 'badge-pill badge-green' : event.status === 'Đang diễn ra' ? 'badge-pill badge-blue' : event.status === 'Đã hủy' ? 'badge-pill badge-gray' : 'badge-pill badge-yellow'}>
                        {event.status}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 65%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    <div className="form-card large" style={{ maxWidth: '100%', margin: 0 }}>
                        <h3 className="section-title">Mô tả sự kiện</h3>
                        <p className="text-secondary" style={{ lineHeight: '1.6', margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>{event.description || 'Không có mô tả chi tiết cho sự kiện này.'}</p>
                        <div className="event-divider"></div>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <div><strong>Phụ trách: </strong> <span className="text-brand font-medium">{leaderName}</span></div>
                            <div><strong>Địa điểm: </strong> {event.location}</div>
                            <div><strong>Thời gian: </strong> {formatDateTime(event.start_date)} - {formatDateTime(event.end_date)}</div>
                        </div>
                    </div>

                    <div className="form-card large" style={{ maxWidth: '100%', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Công việc trong sự kiện ({displayTasks.length}/{tasks.length})</h3>
                            
                            {hasManagerRights && (
                                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '14px', height: '36px', whiteSpace: 'nowrap' }} onClick={() => navigate(`/staff/events/${id}/tasks/add`)}>
                                    + Thêm công việc
                                </button>
                            )}
                        </div>

                        {/* --- BỘ LỌC CÔNG VIỆC TRONG SỰ KIỆN --- */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-neutral)' }}>
                            <div style={{ flex: '1 1 120px' }}>
                                <label className="form-label" style={{ marginBottom: '6px', fontSize: '12px' }}>Trạng thái</label>
                                <select className="form-input" value={filterTaskStatus} onChange={(e) => setFilterTaskStatus(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                                    <option value="">Tất cả</option>
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="in_progress">Đang tiến hành</option>
                                    <option value="submitted">Chờ phê duyệt</option>
                                    <option value="completed">Đã hoàn thành</option>
                                    <option value="cancelled">Đã hủy</option>
                                </select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label className="form-label" style={{ marginBottom: '6px', fontSize: '12px' }}>Ưu tiên</label>
                                <select className="form-input" value={filterTaskPriority} onChange={(e) => setFilterTaskPriority(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                                    <option value="">Tất cả</option>
                                    <option value="high">Cao</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="low">Thấp</option>
                                </select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label className="form-label" style={{ marginBottom: '6px', fontSize: '12px' }}>Hạn từ ngày</label>
                                <input type="date" className="form-input" value={filterTaskFromDate} onChange={(e) => setFilterTaskFromDate(e.target.value)} style={{ padding: '6px 12px', height: '36px' }} />
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label className="form-label" style={{ marginBottom: '6px', fontSize: '12px' }}>Hạn đến ngày</label>
                                <input type="date" className="form-input" value={filterTaskToDate} onChange={(e) => setFilterTaskToDate(e.target.value)} style={{ padding: '6px 12px', height: '36px' }} />
                            </div>
                            <button type="button" className="btn-secondary" onClick={handleResetFilter} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>Khôi phục</button>
                        </div>
                        
                        {displayTasks.length === 0 ? (
                            <p className="text-center text-secondary" style={{ padding: '16px 0', margin: 0, fontSize: '14px' }}>Không có công việc nào khớp với bộ lọc.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {displayTasks.map((task, index) => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => navigate(`/staff/tasks/view/${task.id}`)} 
                                        style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', 
                                            borderBottom: index === displayTasks.length - 1 ? 'none' : '1px solid var(--border-neutral)',
                                            cursor: 'pointer', transition: 'background-color 0.2s', borderRadius: '8px',
                                            flexWrap: 'wrap', gap: '12px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ flex: '1 1 200px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{task.title}</h4>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{getPriorityIcon(task.priority)}</span>
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    Hạn: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    Giao cho: <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{task.assigned_name || 'Chưa phân công'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '160px', justifyContent: 'flex-end' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', border: 'none', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', ...getSelectStyle(task.status) }}>
                                                {renderTaskStatusText(task.status)}
                                            </span>
                                            
                                            {hasManagerRights && (
                                                <button 
                                                    onClick={(e) => handleDeleteTask(e, task.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 }}
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: '1 1 28%', minWidth: '300px', margin: 0 }}>
                    <div className="form-card" style={{ maxWidth: '100%', margin: 0, padding: '24px', height: 'fit-content' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Thành viên tham gia ({members.length})</h3>
                            {hasManagerRights && (
                                <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => navigate(`/staff/events/${id}/members/add`)}>
                                    + Thêm
                                </button>
                            )}
                        </div>
                        
                        {members.length === 0 ? (
                            <p className="text-secondary text-center" style={{ fontSize: '13px' }}>Chưa có thành viên.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {members.map((member, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>
                                                {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <p className="user-name" style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{member.full_name}</p>
                                                <p className="user-role" style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                    {member.role_in_event === 'coordinator' ? 'Điều phối viên' : 'Thành viên'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {hasManagerRights && (
                                            <button 
                                                onClick={() => handleRemoveMember(member.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: 0 }}
                                            >
                                                Xóa
                                            </button>
                                        )}
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