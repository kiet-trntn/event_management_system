import React, { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";

function Layout() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNewNotifToast, setShowNewNotifToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const prevUnreadRef = useRef(0);
    const toastTimerRef = useRef(null);
    const isInitialFetch = useRef(true);

    const notifRef = useRef(null);
    const userRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));

    // Hook đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
            if (userRef.current && !userRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('my_token');
        navigate('/login');
    };

    // Hàm tải dữ liệu thông báo
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
        } catch (error) { console.error("Lỗi tải thông báo:", error); }
    }, []);

    // Tự động quét thông báo mỗi 15 giây
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 3000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        return () => {
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
            // Sửa đường dẫn /admin hoặc /staff tùy thuộc vào trang bạn đang dùng
            if (type === 'task' && relatedId) navigate(`/admin/tasks/view/${relatedId}`);
            else if (type === 'event' && relatedId) navigate(`/admin/events/view/${relatedId}`);
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
        e.stopPropagation(); // Ngăn click lan ra ngoài
        try {
            await fetch(`http://localhost:5000/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            fetchNotifications();
        } catch (error) { console.error(error); }
    };

    return (
        <>
           <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
    <div className="sidebar-logo-box">
        <img src="/favicon.svg" alt="TaskFlow Logo" className="sidebar-logo-img" />
        <h1 className="sidebar-logo-text">TASKFLOW</h1>
    </div>
    
    <nav className="sidebar-nav" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
         <NavLink to="/admin/dashboard" className="nav-item">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path>
                        </svg>
            <span className="nav-text">Tổng Quan</span>
        </NavLink> 

        <NavLink to="/admin/events" className="nav-item">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span className="nav-text">Quản Lý Sự Kiện</span>
        </NavLink>
        
        <NavLink to="/admin/tasks" className="nav-item">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            <span className="nav-text">Quản Lý Công Việc</span>
        </NavLink>
        
        <NavLink to="/admin/members" className="nav-item">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <span className="nav-text">Thành Viên & Quyền Hạn</span>
        </NavLink>
        
        <NavLink to="/admin/reports" className="nav-item">
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"></path></svg>
            <span className="nav-text">Báo Cáo</span>
        </NavLink>

        {/* NÚT THÙNG RÁC NẰM Ở GÓC DƯỚI */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            <NavLink to="/admin/trash" className="nav-item" style={{ color: '#EF4444' }}>
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span className="nav-text">Thùng Rác</span>
            </NavLink>
        </div>
    </nav>
</aside>

            <main className="main-content">
                <header className="header" style={{ justifyContent: 'flex-end' }}>
                    <div className="header-actions">
                        
                        {/* CỤM THÔNG BÁO */}
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <button 
                                className="notification-btn" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setIsNotifOpen(!isNotifOpen); 
                                    setIsDropdownOpen(false); 
                                }}
                            >
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

                        {/* CỤM USER */}
                        <div className="user-profile" ref={userRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                            <div className="user-avatar">{user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : "US"}</div>
                            <div className="user-info">
                                <p className="user-name">{user?.full_name || "Chưa đăng nhập"}</p>
                                <p className="user-role">{user?.role || "Admin"}</p>
                            </div>
                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <NavLink to="/admin/changepassword" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>Đổi Mật Khẩu</NavLink>
                                    <div className="dropdown-divider" />
                                    <button onClick={(e) => { setIsDropdownOpen(false); handleSignOut(e); }} className="dropdown-item text-error" style={{ width: '100%', textAlign: 'left' }}>Đăng Xuất</button>
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