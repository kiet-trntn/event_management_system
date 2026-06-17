import React, { useState } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";

function Header() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));

    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-logo-box">
                    <img src="/favicon.svg" alt="TaskFlow Logo" className="sidebar-logo-img" />
                    <h1 className="sidebar-logo-text">TASKFLOW</h1>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/staff/dashboard" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path>
                        </svg>
                        <span className="nav-text">Tổng Quan</span>
                    </NavLink>
    
                    <NavLink to="/staff/events" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                        <span className="nav-text">Sự kiện của tôi</span>
                    </NavLink>
    
                    <NavLink to="/staff/tasks" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        </svg>
                        <span className="nav-text">Công việc của tôi</span>
                    </NavLink>

                    <NavLink to="/staff/calendar" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span className="nav-text">Lịch làm việc</span>
                    </NavLink>

                    <NavLink to="/staff/messages" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <span className="nav-text">Tin nhắn</span>
                    </NavLink>
                </nav>
            </aside>

            {/* BỌC TOÀN BỘ HEADER VÀ NỘI DUNG VÀO main-content */}
            <main className="main-content">
                <header className="header">
                    <div className="header-actions">
                        <button className="notification-btn">
                            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                            </svg>
                            <span className="notification-badge"></span>
                        </button>

                        <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ position: 'relative', cursor: 'pointer' }}>
                            <div className="user-avatar">
                                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : "US"}
                            </div>
                            <div className="user-info">
                                <p className="user-name">{user?.full_name || "Chưa đăng nhập"}</p>
                                <p className="user-role">{user?.role || "Staff"}</p>
                            </div>

                            {/* Fix lỗi CSS tàng hình của Dropdown */}
                            {isDropdownOpen && (
                                <div className="dropdown-menu" style={{ opacity: 1, visibility: 'visible', transform: 'translateY(0)' }}>
                                    <Link 
                                        to="/staff/changepassword" 
                                        className="dropdown-item"
                                        onClick={() => setIsDropdownOpen(false)} 
                                    >
                                        Đổi Mật Khẩu
                                    </Link>
                                                                                       
                                    <div className="dropdown-divider" />
                                                                                       
                                    <button 
                                        onClick={(e) => {
                                            setIsDropdownOpen(false);
                                            handleSignOut(e);
                                        }} 
                                        className="dropdown-item text-error"
                                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                         Đăng Xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* BỌC OUTLET VÀO TRONG page-container */}
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </>
    );
}

export default Header;