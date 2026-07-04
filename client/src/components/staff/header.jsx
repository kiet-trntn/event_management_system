import React, { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom"; 
import io from 'socket.io-client'; 

function Layout() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    
    const [unreadCount, setUnreadCount] = useState(0); 
    const [unreadMessageCount, setUnreadMessageCount] = useState(0); 

    const [showNewNotifToast, setShowNewNotifToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const prevUnreadRef = useRef(0);
    const toastTimerRef = useRef(null);
    const isInitialFetch = useRef(true);

    const notifRef = useRef(null);
    const userRef = useRef(null);
    const searchRef = useRef(null); 
    const user = JSON.parse(localStorage.getItem('user'));

    // =========================================================
    // LOGIC TÌM KIẾM TOÀN NĂNG CHO STAFF (Chỉ tìm Sự kiện & Task)
    // =========================================================
    const [globalSearch, setGlobalSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchResults, setSearchResults] = useState({ events: [], tasks: [] }); // Bỏ users
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(globalSearch), 500);
        return () => clearTimeout(timer);
    }, [globalSearch]);

    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setSearchResults({ events: [], tasks: [] });
            setIsSearchOpen(false);
            return;
        }

        const fetchAllSearch = async () => {
            setIsSearching(true);
            setIsSearchOpen(true);
            try {
                const token = localStorage.getItem('my_token');
                const headers = { 'Authorization': `Bearer ${token}` };
                
                const [eventsRes, tasksRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/events?search=${debouncedSearch}`, { headers }),
                    fetch(`http://localhost:5000/api/tasks/my-tasks?search=${debouncedSearch}`, { headers })
                ]);
                
                const eventsData = await eventsRes.json();
                const tasksData = await tasksRes.json();
                
                setSearchResults({
                    events: eventsData.events ? eventsData.events.slice(0, 4) : [],
                    tasks: tasksData.tasks ? tasksData.tasks.slice(0, 4) : [] 
                });
            } catch (error) {
                console.error("Lỗi tìm kiếm:", error);
            } finally {
                setIsSearching(false);
            }
        };

        fetchAllSearch();
    }, [debouncedSearch]);

    const handleResultClick = (path) => {
        setIsSearchOpen(false);
        setGlobalSearch('');
        navigate(path);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
            if (userRef.current && !userRef.current.contains(event.target)) setIsDropdownOpen(false);
            if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // =========================================================
    // LOGIC THÔNG BÁO VÀ CHAT 
    // =========================================================
    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('my_token');
        navigate('/login');
    };

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem('my_token');
        if (!token) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [notifRes, countRes] = await Promise.all([
                fetch('http://localhost:5000/api/notifications', { headers }),
                fetch('http://localhost:5000/api/notifications/unread-count', { headers })
            ]);
            if (notifRes.ok) {
                const data = await notifRes.json();
                setNotifications(data.notifications || []);
            }
            if (countRes.ok) {
                const data = await countRes.json();
                const count = data.unread_count || 0;
                if (!isInitialFetch.current && count > prevUnreadRef.current) {
                    const delta = count - prevUnreadRef.current;
                    setToastMessage(`Bạn có ${delta} thông báo mới`);
                    setShowNewNotifToast(true);
                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => setShowNewNotifToast(false), 4000);
                }
                setUnreadCount(count);
                prevUnreadRef.current = count;
            }
            isInitialFetch.current = false;
        } catch (error) { console.error("Lỗi:", error); }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 3000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const token = localStorage.getItem('my_token');
        if (!token) return;

        const fetchUnreadMessages = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/direct-messages/conversations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const totalUnread = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                    setUnreadMessageCount(totalUnread);
                }
            } catch (error) { console.error(error); }
        };

        fetchUnreadMessages();

        const socket = io('http://localhost:5000', { auth: { token } });
        const handleNewMessage = (msg) => {
            try {
                const currentUser = JSON.parse(window.atob(token.split('.')[1]));
                if (Number(msg.sender_id) !== Number(currentUser.id)) {
                    if (!window.location.pathname.includes('/messages')) {
                        setUnreadMessageCount(prev => prev + 1);
                    }
                }
            } catch (e) {}
        };

        socket.on('new_direct_message', handleNewMessage);
        socket.on('new_message', handleNewMessage); 

        return () => {
            socket.disconnect();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const handleReadNotif = async (id, relatedId, type) => {
        try {
            await fetch(`http://localhost:5000/api/notifications/${id}/read`, { 
                method: 'PATCH', 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` } 
            });
            fetchNotifications();
            setIsNotifOpen(false);
            if (type === 'task' && relatedId) navigate(`/staff/tasks/view/${relatedId}`);
            else if (type === 'event' && relatedId) navigate(`/staff/events/view/${relatedId}`);
            else if (type === 'message' && relatedId) navigate(`/staff/messages`);
        } catch (error) { console.error(error); }
    };

    const handleReadAll = async () => {
        try {
            await fetch(`http://localhost:5000/api/notifications/read-all`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            fetchNotifications();
        } catch (error) { console.error(error); }
    };

    const handleDeleteNotif = async (e, id) => {
        e.stopPropagation(); 
        try {
            await fetch(`http://localhost:5000/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            fetchNotifications();
        } catch (error) { console.error(error); }
    };

    const handleMessagesClick = () => {
        setUnreadMessageCount(0);
    };

    return (
        <>
           <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="sidebar-logo-box">
                    <img src="/favicon.svg" alt="TaskFlow Logo" className="sidebar-logo-img" />
                    <h1 className="sidebar-logo-text">TASKFLOW</h1>
                </div>
                
                <nav className="sidebar-nav" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <NavLink to="/staff/dashboard" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path>
                        </svg>
                        <span className="nav-text">Tổng Quan</span>
                    </NavLink>
    
                    <NavLink to="/staff/events" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                        <span className="nav-text">Sự kiện của tôi</span>
                    </NavLink>
    
                    <NavLink to="/staff/tasks" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        </svg>
                        <span className="nav-text">Công việc của tôi</span>
                    </NavLink>

                    <NavLink to="/staff/calendar" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span className="nav-text">Lịch làm việc</span>
                    </NavLink>
                    
                    <NavLink to="/staff/messages" className="nav-item" onClick={handleMessagesClick}>
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <span className="nav-text" style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Tin Nhắn
                            {unreadMessageCount > 0 && (
                                <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px' }}>
                                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                                </span>
                            )}
                        </span>
                    </NavLink>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                        <NavLink to="/staff/trash" className="nav-item" style={{ color: '#EF4444' }}>
                            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            <span className="nav-text">Thùng Rác</span>
                        </NavLink>
                    </div>
                </nav>
            </aside>

            <main className="main-content">
                <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
                    
                    {/* KHỐI TRÁI */}
                    <div style={{ flex: 1 }}></div>

                    {/* KHỐI GIỮA: THANH TÌM KIẾM TOÀN NĂNG */}
                    <div style={{ flex: 2, display: 'flex', justifyContent: 'center', maxWidth: '650px', margin: '0 20px' }}>
                        <div style={{ position: 'relative', width: '100%' }} ref={searchRef}>
                            <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '20px', height: '20px', zIndex: 1 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input 
                                type="text" 
                                className="form-input"
                                placeholder="Tìm kiếm sự kiện, công việc của tôi..." 
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onFocus={() => { if(globalSearch) setIsSearchOpen(true) }}
                                style={{ 
                                    width: '100%', 
                                    padding: '12px 20px 12px 46px', 
                                    borderRadius: '30px', 
                                    backgroundColor: '#F1F5F9', 
                                    fontSize: '15px',
                                    border: '1px solid transparent'
                                }}
                            />
                            
                            {/* POPUP HIỂN THỊ KẾT QUẢ TÌM KIẾM DÀNH CHO STAFF */}
                            {isSearchOpen && globalSearch && (
                                <div style={{ 
                                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', 
                                    backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                    border: '1px solid #e2e8f0', zIndex: 9999, maxHeight: '450px', overflowY: 'auto', padding: '8px 0' 
                                }}>
                                    {isSearching ? (
                                        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Đang tìm kiếm...</div>
                                    ) : (searchResults.events.length === 0 && searchResults.tasks.length === 0) ? (
                                        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Không tìm thấy kết quả nào cho "{globalSearch}".</div>
                                    ) : (
                                        <>
                                            {searchResults.events.length > 0 && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sự kiện của tôi</div>
                                                    {searchResults.events.map(e => (
                                                        <div key={`ev-${e.id}`} onClick={() => handleResultClick(`/staff/events/view/${e.id}`)} className="dropdown-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontWeight: '600', color: '#111827' }}>{e.title}</span>
                                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{e.location} - {e.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {searchResults.tasks.length > 0 && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Công việc của tôi</div>
                                                    {searchResults.tasks.map(t => (
                                                        <div key={`tk-${t.id}`} onClick={() => handleResultClick(`/staff/tasks/view/${t.id}`)} className="dropdown-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontWeight: '600', color: '#111827' }}>{t.title}</span>
                                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Thuộc: {t.event_title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KHỐI PHẢI */}
                    <div className="header-actions" style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <button className="notification-btn" onClick={(e) => { e.stopPropagation(); setIsNotifOpen(!isNotifOpen); setIsDropdownOpen(false); }}>
                                <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                                </svg>
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                            </button>
                            
                            {isNotifOpen && (
                                <div className="notif-dropdown">
                                    <div className="notif-header">
                                        <h4>Thông báo</h4>
                                        {unreadCount > 0 && <button className="btn-read-all" onClick={handleReadAll}>Đánh dấu đã đọc</button>}
                                    </div>
                                    <div className="notif-body">
                                        {notifications.length === 0 ? <p className="notif-empty">Bạn không có thông báo nào.</p> :
                                            notifications.map(notif => (
                                                <div key={notif.id} className={`notif-item ${notif.is_read ? '' : 'unread'}`} onClick={() => handleReadNotif(notif.id, notif.related_id, notif.type)}>
                                                    <div className="notif-content-box">
                                                        <p className="notif-title">{notif.title}</p>
                                                        <p className="notif-desc">{notif.content}</p>
                                                        <p className="notif-time">{new Date(notif.created_at).toLocaleString('vi-VN')}</p>
                                                    </div>
                                                    <button className="notif-delete-btn" onClick={(e) => handleDeleteNotif(e, notif.id)}>✕</button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            {showNewNotifToast && (
                                <div className="notif-toast">
                                    <span>{toastMessage}</span>
                                    <button className="toast-close" onClick={() => setShowNewNotifToast(false)}>✕</button>
                                </div>
                            )}
                        </div>

                        <div className="user-profile" ref={userRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                            <div className="user-avatar">{user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : "US"}</div>
                            <div className="user-info">
                                <p className="user-name">{user?.full_name || "Chưa đăng nhập"}</p>
                                <p className="user-role">{user?.role === 'admin' ? "Admin" : (user?.role === 'leader' ? "Leader" : "Nhân viên")}</p>
                            </div>
                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <NavLink to="/staff/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Tài Khoản
                                    </NavLink>
                                    
                                    <div className="dropdown-divider" />
                                    
                                    <button onClick={(e) => { setIsDropdownOpen(false); handleSignOut(e); }} className="dropdown-item text-error" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Đăng Xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <div className="page-container"><Outlet /></div>
            </main>
        </>
    );
}

export default Layout;