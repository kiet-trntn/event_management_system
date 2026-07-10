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

    // --- TIMELINE STATE ---
    const [timeline, setTimeline] = useState(null);
    const [timelineItems, setTimelineItems] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(true);

    const [filterTaskStatus, setFilterTaskStatus] = useState('');
    const [filterTaskPriority, setFilterTaskPriority] = useState('');
    const [filterTaskType, setFilterTaskType] = useState(''); 
    const [filterTaskFromDate, setFilterTaskFromDate] = useState('');
    const [filterTaskToDate, setFilterTaskToDate] = useState('');

    const [filterMemberStatus, setFilterMemberStatus] = useState('');
    const [friendshipStatuses, setFriendshipStatuses] = useState({});

    useEffect(() => {
        try {
            const token = localStorage.getItem('my_token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setCurrentUser(payload);
            }
        } catch (error) { console.error("Lỗi giải mã token:", error); }
    }, []);

    useEffect(() => {
        const timerId = setTimeout(() => { setDebouncedSearch(urlSearch); }, 500); 
        return () => clearTimeout(timerId);
    }, [urlSearch]);

    const fetchFriendshipData = useCallback(async () => {
        try {
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [friendsRes, sentRequestsRes] = await Promise.all([
                fetch('http://localhost:5000/api/friends', { headers }),
                fetch('http://localhost:5000/api/friends/requests/sent', { headers })
            ]);
            const mapping = {};
            if (friendsRes.ok) {
                const data = await friendsRes.json();
                (data.friends || []).forEach(f => { mapping[f.user_id] = 'accepted'; });
            }
            if (sentRequestsRes.ok) {
                const data = await sentRequestsRes.json();
                (data.requests || []).forEach(r => { mapping[r.receiver_id] = 'pending'; });
            }
            setFriendshipStatuses(mapping);
        } catch (e) { console.error(e); }
    }, []);

    // Tải mốc thời gian lịch trình
    const fetchTimelineData = useCallback(async () => {
        try {
            setLoadingTimeline(true);
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/timelines/events/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTimeline(data.timeline);
                setTimelineItems(data.items || []);
            } else {
                setTimeline(null);
                setTimelineItems([]);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingTimeline(false); }
    }, [id]);

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
                setTasks((tasksData.tasks || []).filter(t => !t.is_deleted));

                if (membersRes && membersRes.ok) {
                    setMembers((await membersRes.json()).members || []);
                }
                await fetchFriendshipData();
                await fetchTimelineData(); 
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu sự kiện', 'error');
                navigate('/staff/events');
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi kết nối mạng', 'error'); }
        finally { setLoading(false); }
    }, [id, navigate, debouncedSearch, fetchFriendshipData, fetchTimelineData]);

    useEffect(() => { fetchViewEvent(); }, [fetchViewEvent]);

    const handleSendFriendRequest = async (targetUserId, targetName) => {
        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/friends/requests/${targetUserId}`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                Swal.fire('Thành công', `Đã gửi lời mời kết bạn đến ${targetName}`, 'success');
                setFriendshipStatuses(prev => ({ ...prev, [targetUserId]: 'pending' }));
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
    };

    const handleDeleteTask = async (e, taskId) => {
        e.stopPropagation(); 
        const result = await Swal.fire({ title: 'Xóa công việc này?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                if (response.ok) { Swal.fire('Thành công!', 'Công việc đã xóa.', 'success'); fetchViewEvent(); }
            } catch (err) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
        }
    };

    const handleAddMemberPopup = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/users/available/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const availableUsers = (await res.json()).users || [];
            if (availableUsers.length === 0) return Swal.fire('Thông báo', 'Mọi nhân viên đều đã tham gia.', 'info');

            const inputOptions = {};
            availableUsers.forEach(u => { inputOptions[u.id] = `#${u.id} - ${u.full_name}`; });

            const { value: selectedUserId } = await Swal.fire({ title: 'Thêm thành viên mới', input: 'select', inputOptions, showCancelButton: true });
            if (selectedUserId) {
                const addRes = await fetch(`http://localhost:5000/api/events/${id}/members`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('my_token')}` },
                    body: JSON.stringify({ user_id: selectedUserId })
                });
                if (addRes.ok) { fetchViewEvent(); Swal.fire('Thành công!', 'Đã thêm thành viên.', 'success'); }
            }
        } catch (error) { Swal.fire('Lỗi', 'Thất bại', 'error'); }
    };

    const handleRemoveMember = async (userId) => {
        const result = await Swal.fire({ title: 'Loại bỏ thành viên khỏi sự kiện?', icon: 'warning', showCancelButton: true });
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/members/${userId}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                if (response.ok) { fetchViewEvent(); Swal.fire('Thành công!', 'Đã xóa.', 'success'); }
            } catch (err) { Swal.fire('Lỗi', 'Thất bại', 'error'); }
        }
    };

    const handleCreateTimelineInit = async () => {
        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/timelines/events/${id}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: `Lịch trình của ${event?.title}`, description: 'Trục mốc thời gian chi tiết' })
            });
            if (response.ok) { Swal.fire('Thành công', 'Đã khởi tạo trục thời gian!', 'success'); fetchTimelineData(); }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi mạng', 'error'); }
    };

    // 🟢 THAO TÁC XÓA: Vẫn dùng Cảnh báo xác nhận (Swal) trước khi xóa
    const handleDeleteTimelineItem = async (itemId) => {
        const result = await Swal.fire({
            title: 'Xóa mốc lịch trình này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa ngay'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const res = await fetch(`http://localhost:5000/api/timelines/items/${itemId}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa mốc thời gian', showConfirmButton: false, timer: 1500 });
                    fetchTimelineData();
                } else {
                    const err = await res.json(); Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (e) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
        }
    };

    const handleResetTaskFilter = () => {
        setFilterTaskStatus(''); setFilterTaskPriority(''); setFilterTaskType(''); setFilterTaskFromDate(''); setFilterTaskToDate('');
    };

      const getPriorityIcon = (priority) => {
        switch(priority) {
            case 'high': return <span style={{ color: '#ef4444' }}>Cao</span>;
            case 'medium': return <span style={{ color: '#f59e0b' }}>Trung Bình</span>;
            case 'low': return <span style={{ color: '#10b981' }}>Thấp</span>;
            default: return '';
        }
    };

    const getSelectStyle = (status) => {
        const styles = {
            'pending': { color: '#64748b', backgroundColor: '#f1f5f9' },
            'is_progress': { color: '#2563eb', backgroundColor: '#eff6ff' },
            'submitted': { color: '#ea580c', backgroundColor: '#fff7ed' }, 
            'completed': { color: '#166534', backgroundColor: '#f0fdf4' },
            'cancelled': { color: '#dc2626', backgroundColor: '#fef2f2' }
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

    const getTaskTypeLabel = (type) => {
        if(type === 'preparation') return 'Chuẩn bị';
        if(type === 'during_event') return 'Diễn ra';
        if(type === 'post_event') return 'Kết thúc';
        return type || 'Khác';
    };

    const formatTimeLabel = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const formatDateTime = (value) => {
        if (!value) return 'Không xác định';
        return new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="page-container event-page"><div className="form-card text-center text-secondary">⏳ Đang tải chi tiết sự kiện...</div></div>;
    if (!event) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isLeader = currentUser && event && (Number(event.leader_id) === Number(currentUser.id));
    const hasManagerRights = isAdmin || isLeader; 
    const isEditable = event.status !== 'Đã kết thúc' && event.status !== 'Đã hủy' && event.status !== 'Đang diễn ra';
    const leaderName = event.leader_name || 'Chưa cập nhật';

    const taskTypeOrder = { 'preparation': 1, 'during_event': 2, 'post_event': 3 };

    const displayTasks = tasks
        .filter(t => {
            const matchStatus = filterTaskStatus ? t.status === filterTaskStatus : true;
            const matchPriority = filterTaskPriority ? t.priority === filterTaskPriority : true;
            const matchTaskType = filterTaskType ? t.task_type === filterTaskType : true; 
            let matchFromDate = true; let matchToDate = true;
            if (filterTaskFromDate) matchFromDate = t.due_date ? new Date(t.due_date) >= new Date(filterTaskFromDate) : false;
            if (filterTaskToDate) matchToDate = t.due_date ? new Date(t.due_date) <= new Date(filterTaskToDate) : false;
            return matchStatus && matchPriority && matchTaskType && matchFromDate && matchToDate;
        })
        .sort((a, b) => (taskTypeOrder[a.task_type] || 99) - (taskTypeOrder[b.task_type] || 99));

    const displayMembers = members.filter(m => filterMemberStatus ? m.status === filterMemberStatus : true);

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

                    {/* KHỐI 2: TIMELINE TRỰC TIẾP (LEADER) */}
                    <div className="form-card large" style={{ maxWidth: '100%', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Lịch trình diễn ra sự kiện (Timeline)</h3>
                            {/* 🟢 BẤM THÊM: Sẽ nhảy sang trang dùng chung AddTimelineItem */}
                            {isLeader && isEditable && timeline && (
                                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => navigate(`/staff/timelines/${timeline.id}/items/add`)}>
                                    + Thêm mốc thời gian
                                </button>
                            )}
                        </div>

                        {loadingTimeline ? (
                            <p className="text-secondary">Đang tải lịch trình...</p>
                        ) : !timeline ? (
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                                <p style={{ color: '#6b7280', margin: '0 0 12px 0', fontSize: '14px' }}>Sự kiện này chưa được thiết lập lịch trình mốc thời gian.</p>
                                {isLeader && isEditable && (
                                    <button className="btn-primary" onClick={handleCreateTimelineInit} style={{ fontSize: '13px', padding: '8px 16px' }}>
                                        Khởi tạo trục thời gian ngay
                                    </button>
                                )}
                            </div>
                        ) : timelineItems.length === 0 ? (
                            <p className="text-secondary text-center" style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>Chưa có mốc thời gian nào được ghi nhận.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '10px', borderLeft: '3px solid #e5e7eb', marginTop: '10px' }}>
                                {timelineItems.map((item) => {
                                    let phaseColor = '#64748b';
                                    if (item.phase === 'during_event') phaseColor = '#ea580c';
                                    if (item.phase === 'post_event') phaseColor = '#16a34a';

                                    return (
                                        <div key={item.id} style={{ position: 'relative', paddingBottom: '4px' }}>
                                            <div style={{ position: 'absolute', left: '-18px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: phaseColor, border: '3px solid #fff' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', backgroundColor: phaseColor, padding: '2px 6px', borderRadius: '4px' }}>
                                                            {getTaskTypeLabel(item.phase)}
                                                        </span>
                                                        <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{item.title}</h5>
                                                    </div>
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569' }}>{item.description || 'Không có mô tả công việc.'}</p>
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                                        ⏱ {formatTimeLabel(item.start_time)} - {formatTimeLabel(item.end_time)}
                                                    </span>
                                                </div>
                                                
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                                    {item.task_id && (
                                                        <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                                            <span style={{ color: '#94a3b8' }}>Liên kết: </span>
                                                            <span onClick={() => navigate(`/staff/tasks/view/${item.task_id}`)} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>{item.task_title}</span>
                                                        </div>
                                                    )}
                                                    {isLeader && isEditable && (
                                                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                                            {/* 🟢 BẤM SỬA: Sẽ nhảy sang trang dùng chung EditTimelineItem */}
                                                            <span onClick={() => navigate(`/staff/timelines/items/edit/${item.id}`)} style={{ color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}>Sửa mốc</span>
                                                            <span onClick={() => handleDeleteTimelineItem(item.id)} style={{ color: '#ef4444', fontWeight: '600', cursor: 'pointer' }}>Xóa</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                            <div style={{ flex: '1 1 120px' }}><select className="form-input" value={filterTaskStatus} onChange={(e) => setFilterTaskStatus(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}><option value="">Tất cả trạng thái</option><option value="pending">Chờ xử lý</option><option value="in_progress">Đang tiến hành</option><option value="submitted">Chờ phê duyệt</option><option value="completed">Đã hoàn thành</option><option value="cancelled">Đã hủy</option></select></div>
                            <div style={{ flex: '1 1 120px' }}><select className="form-input" value={filterTaskPriority} onChange={(e) => setFilterTaskPriority(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}><option value="">Tất cả ưu tiên</option><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div>
                            <div style={{ flex: '1 1 120px' }}><select className="form-input" value={filterTaskType} onChange={(e) => setFilterTaskType(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}><option value="">Tất cả giai đoạn</option><option value="preparation">Chuẩn bị</option><option value="during_event">Diễn ra</option><option value="post_event">Kết thúc</option></select></div>
                            <div style={{ flex: '1 1 120px', position: 'relative' }}><input type={filterTaskFromDate ? 'date' : 'text'} placeholder="Từ ngày..." className="form-input" value={filterTaskFromDate} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} onChange={(e) => setFilterTaskFromDate(e.target.value)} style={{ padding: '6px 12px', height: '36px', width: '100%' }} /></div>
                            <div style={{ flex: '1 1 120px', position: 'relative' }}><input type={filterTaskToDate ? 'date' : 'text'} placeholder="Đến ngày..." className="form-input" value={filterTaskToDate} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} onChange={(e) => setFilterTaskToDate(e.target.value)} style={{ padding: '6px 12px', height: '36px', width: '100%' }} /></div>
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
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: index === displayTasks.length - 1 ? 'none' : '1px solid var(--border-neutral)', cursor: 'pointer', transition: 'background-color 0.2s', borderRadius: '8px', flexWrap: 'wrap', gap: '12px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ flex: '1 1 200px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{task.title}</h4>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{getPriorityIcon(task.priority)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Hạn: {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có hạn'}</p>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Giai đoạn: <span style={{ fontWeight: '500', color: '#475569' }}>{getTaskTypeLabel(task.task_type)}</span></p>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Giao cho: <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{task.assigned_name || 'Chưa phân công'}</span></p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '160px', justifyContent: 'flex-end' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', ...getSelectStyle(task.status) }}>{renderTaskStatusText(task.status)}</span>
                                            {hasManagerRights && isEditable && (
                                                <button onClick={(e) => handleDeleteTask(e, task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 }}>Xóa</button>
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
                                <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleAddMemberPopup}>+ Thêm</button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-neutral)' }}><select className="form-input" style={{ padding: '4px 8px', fontSize: '12px', height: '30px', flex: 1 }} value={filterMemberStatus} onChange={(e) => setFilterMemberStatus(e.target.value)}><option value="">Tất cả trạng thái TK</option><option value="active">Đang hoạt động</option><option value="inactive">Đã khóa</option></select></div>
                        {displayMembers.length === 0 ? (
                            <p className="text-secondary text-center" style={{ fontSize: '13px' }}>Không có thành viên nào khớp bộ lọc.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {displayMembers.map((member, index) => {
                                    const isMe = currentUser && Number(currentUser.id) === Number(member.user_id);
                                    const fStatus = friendshipStatuses[member.user_id];
                                    return (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className="user-avatar" style={{ backgroundColor: 'var(--primary-color)' }}>{member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}</div>
                                                <div>
                                                    <p className="user-name" style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                                                        {member.full_name} {isMe && <span style={{color: '#94a3b8', fontSize: '12px'}}>(Tôi)</span>}
                                                        {member.status === 'inactive' && <span style={{color: '#ef4444', fontSize: '11px', marginLeft: '4px'}}>(Đã khóa)</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {!isMe && member.status === 'active' && (
                                                    <>
                                                        {!fStatus && (<button onClick={() => handleSendFriendRequest(member.user_id, member.full_name)} style={{ background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '4px 8px', borderRadius: '4px' }}>+ Kết bạn</button>)}
                                                        {fStatus === 'pending' && (<span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>Đang chờ...</span>)}
                                                        {fStatus === 'accepted' && (<button onClick={() => navigate('/staff/messages', { state: { autoOpenChat: member }})} style={{ background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '4px 8px', borderRadius: '4px' }}>Nhắn tin</button>)}
                                                    </>
                                                )}
                                                {hasManagerRights && isEditable && (
                                                    <button onClick={() => handleRemoveMember(member.user_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: 0, marginLeft: '8px' }}>Xóa</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ViewEvent;