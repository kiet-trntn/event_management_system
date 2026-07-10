import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const urlSearch = new URLSearchParams(location.search).get('search') || '';
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

    const [event, setEvent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null); 

    const [filterTaskStatus, setFilterTaskStatus] = useState('');
    const [filterTaskPriority, setFilterTaskPriority] = useState('');
    const [filterTaskType, setFilterTaskType] = useState(''); 
    const [filterTaskFromDate, setFilterTaskFromDate] = useState('');
    const [filterTaskToDate, setFilterTaskToDate] = useState('');

    const [filterMemberStatus, setFilterMemberStatus] = useState('');

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

    useEffect(() => {
        const timerId = setTimeout(() => { setDebouncedSearch(urlSearch); }, 500); 
        return () => clearTimeout(timerId);
    }, [urlSearch]);

    const fetchViewEvent = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);

            const [eventRes, tasksRes, membersRes] = await Promise.all([
                fetch(`http://localhost:5000/api/events/${id}`, { headers }),
                fetch(`http://localhost:5000/api/tasks?event_id=${id}&${queryParams.toString()}`, { headers }),
                fetch(`http://localhost:5000/api/events/${id}/members?${queryParams.toString()}`, { headers }).catch(() => null)
            ]);

            if (eventRes.ok && tasksRes.ok) {
                const eventData = await eventRes.json();
                const tasksData = await tasksRes.json();
                
                setEvent(eventData.event || eventData);
                
                const filteredTasks = (tasksData.tasks || []).filter(t => !t.is_deleted);
                setTasks(filteredTasks);

                if (membersRes && membersRes.ok) {
                    const membersData = await membersRes.json();
                    setMembers(membersData.members || []);
                }
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu chi tiết', 'error');
                navigate('/admin/events');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, debouncedSearch]);

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

    const handleAddMemberPopup = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/users/available/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await res.json();
            const availableUsers = data.users || [];

            if (availableUsers.length === 0) {
                return Swal.fire('Thông báo', 'Tất cả nhân viên hợp lệ đều đã tham gia sự kiện này.', 'info');
            }

            const inputOptions = {};
            availableUsers.forEach(u => {
                inputOptions[u.id] = `#${u.id} - ${u.full_name}`;
            });

            const { value: selectedUserId } = await Swal.fire({
                title: 'Thêm thành viên mới',
                input: 'select',
                inputOptions: inputOptions,
                inputPlaceholder: '--- Chọn nhân viên ---',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: 'Thêm vào sự kiện',
                cancelButtonText: 'Hủy bỏ',
                inputValidator: (value) => {
                    if (!value) return 'Vui lòng chọn một nhân viên!';
                }
            });

            if (selectedUserId) {
                Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                const addRes = await fetch(`http://localhost:5000/api/events/${id}/members`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                    },
                    body: JSON.stringify({ user_id: selectedUserId })
                });

                if (addRes.ok) {
                    Swal.fire('Thành công!', 'Đã thêm thành viên vào sự kiện.', 'success');
                    fetchViewEvent();
                } else {
                    const errorData = await addRes.json();
                    Swal.fire('Lỗi', errorData.message || 'Không thể thêm thành viên', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
        }
    };

    const handleRemoveMember = async (userId) => {
        const result = await Swal.fire({
            title: 'Loại bỏ thành viên?',
            text: "Nhân viên này sẽ bị loại hoàn toàn khỏi sự kiện.",
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
                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã xóa thành viên khỏi sự kiện.', 'success');
                    fetchViewEvent();
                } else if (response.status === 409 && data.need_confirm) {
                    const confirmResult = await Swal.fire({
                        title: 'Thành viên đang có công việc!',
                        html: `Người này đang phụ trách <b>${data.affected_task_count}</b> công việc chưa hoàn thành.<br/><br/>Nếu tiếp tục xóa, các công việc này sẽ bị gỡ người phụ trách. Bạn có chắc chắn không?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#9ca3af',
                        confirmButtonText: 'Đồng ý xóa & Gỡ việc',
                        cancelButtonText: 'Hủy bỏ'
                    });

                    if (confirmResult.isConfirmed) {
                        const confirmRes = await fetch(`http://localhost:5000/api/events/${id}/members/${userId}?confirm=true`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                        });
                        if (confirmRes.ok) {
                            Swal.fire('Đã xóa!', 'Thành viên đã bị xóa và gỡ công việc thành công.', 'success');
                            fetchViewEvent();
                        } else {
                            const errData = await confirmRes.json();
                            Swal.fire('Lỗi!', errData.message, 'error');
                        }
                    }
                } else {
                    Swal.fire('Thất bại!', data.message || 'Không thể xóa thành viên', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Mất kết nối server', 'error');
            }
        }
    };

    const handleResetTaskFilter = () => {
        setFilterTaskStatus('');
        setFilterTaskPriority('');
        setFilterTaskType('');
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

    const getTaskTypeLabel = (type) => {
        if(type === 'preparation') return 'Chuẩn bị';
        if(type === 'during_event') return 'Diễn ra';
        if(type === 'post_event') return 'Kết thúc';
        return type || 'Khác';
    };

    if (loading) return <div className="page-container event-page"><div className="form-card text-center text-secondary">Đang tải chi tiết sự kiện...</div></div>;
    if (!event) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isLeader = currentUser && event && (Number(event.leader_id) === Number(currentUser.id));
    const hasManagerRights = isAdmin || isLeader; 
    const isEditable = event.status !== 'Đã kết thúc' && event.status !== 'Đã hủy' && event.status !== 'Đang diễn ra';
    const leaderName = event.leader_name || 'Chưa cập nhật';

    const formatDateTime = (value) => {
        if (!value) return 'Không xác định';
        return new Date(value).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Định nghĩa thứ tự ưu tiên cho task_type
    const taskTypeOrder = {
        'preparation': 1,
        'during_event': 2,
        'post_event': 3
    };

    // Filter đồng thời thực hiện SORT theo thứ tự chuẩn bị -> diễn ra -> kết thúc
    const displayTasks = tasks
        .filter(t => {
            const matchStatus = filterTaskStatus ? t.status === filterTaskStatus : true;
            const matchPriority = filterTaskPriority ? t.priority === filterTaskPriority : true;
            const matchTaskType = filterTaskType ? t.task_type === filterTaskType : true; 
            let matchFromDate = true;
            let matchToDate = true;
            if (filterTaskFromDate) {
                matchFromDate = t.due_date ? new Date(t.due_date) >= new Date(filterTaskFromDate) : false;
            }
            if (filterTaskToDate) {
                matchToDate = t.due_date ? new Date(t.due_date) <= new Date(filterTaskToDate) : false;
            }
            return matchStatus && matchPriority && matchTaskType && matchFromDate && matchToDate;
        })
        .sort((a, b) => {
            const orderA = taskTypeOrder[a.task_type] || 99;
            const orderB = taskTypeOrder[b.task_type] || 99;
            return orderA - orderB; // Sắp xếp từ 1 -> 2 -> 3
        });

    const displayMembers = members.filter(m => {
        const matchStatus = filterMemberStatus ? m.status === filterMemberStatus : true;
        return matchStatus;
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
                            
                            {hasManagerRights && isEditable && (
                                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '14px', height: '36px', whiteSpace: 'nowrap' }} onClick={() => navigate(`/staff/tasks/add?event_id=${id}`)}>
                                    + Thêm công việc
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-neutral)' }}>
                            <div style={{ flex: '1 1 120px' }}>
                                <select className="form-input" value={filterTaskStatus} onChange={(e) => setFilterTaskStatus(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="in_progress">Đang tiến hành</option>
                                    <option value="submitted">Chờ phê duyệt</option>
                                    <option value="completed">Đã hoàn thành</option>
                                    <option value="cancelled">Đã hủy</option>
                                </select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <select className="form-input" value={filterTaskPriority} onChange={(e) => setFilterTaskPriority(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                                    <option value="">Tất cả ưu tiên</option>
                                    <option value="high">Cao</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="low">Thấp</option>
                                </select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <select className="form-input" value={filterTaskType} onChange={(e) => setFilterTaskType(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                                    <option value="">Tất cả giai đoạn</option>
                                    <option value="preparation">Chuẩn bị</option>
                                    <option value="during_event">Diễn ra</option>
                                    <option value="post_event">Kết thúc</option>
                                </select>
                            </div>
                            <div style={{ flex: '1 1 120px', position: 'relative' }}>
                                <input 
                                    type={filterTaskFromDate ? 'date' : 'text'} 
                                    placeholder="Từ ngày..." 
                                    className="form-input" 
                                    value={filterTaskFromDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setFilterTaskFromDate(e.target.value)} 
                                    style={{ padding: '6px 12px', height: '36px', width: '100%' }} 
                                />
                            </div>
                            
                            <div style={{ flex: '1 1 120px', position: 'relative' }}>
                                <input 
                                    type={filterTaskToDate ? 'date' : 'text'} 
                                    placeholder="Đến ngày..." 
                                    className="form-input" 
                                    value={filterTaskToDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setFilterTaskToDate(e.target.value)} 
                                    style={{ padding: '6px 12px', height: '36px', width: '100%' }} 
                                />
                            </div>
                            <button type="button" className="btn-secondary" onClick={handleResetTaskFilter} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>Khôi phục</button>
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
                                                    Giai đoạn: <span style={{ fontWeight: '500', color: '#475569' }}>{getTaskTypeLabel(task.task_type)}</span>
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
                                            
                                            {hasManagerRights && isEditable && (
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
                        
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Thành viên ({displayMembers.length}/{members.length})</h3>
                            {hasManagerRights && isEditable && (
                                <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleAddMemberPopup}>
                                    + Thêm
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-neutral)' }}>
                            <select 
                                className="form-input" 
                                style={{ padding: '4px 8px', fontSize: '12px', height: '30px', flex: 1 }} 
                                value={filterMemberStatus} 
                                onChange={(e) => setFilterMemberStatus(e.target.value)}
                            >
                                <option value="">Tất cả trạng thái TK</option>
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Đã khóa</option>
                            </select>
                        </div>
                        
                        {displayMembers.length === 0 ? (
                            <p className="text-secondary text-center" style={{ fontSize: '13px' }}>Không có thành viên nào khớp bộ lọc.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {displayMembers.map((member, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>
                                                {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <p className="user-name" style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                                                    {member.full_name} 
                                                    {member.status === 'inactive' && <span style={{color: '#ef4444', fontSize: '11px', marginLeft: '4px'}}>(Đã khóa)</span>}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {hasManagerRights && isEditable && (
                                            <button 
                                                onClick={() => handleRemoveMember(member.user_id)}
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