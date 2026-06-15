import {Link,NavLink,useNavigate} from "react-router-dom";
import React,{ useState } from "react";
import { Outlet } from "react-router-dom";

function Header() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));

    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        navigate('/login');
    };
    return (
        <>
        <aside className="sidebar">
            <div className="sidebar-logo"><h1>TASKFLOW</h1></div>
            <nav className="sidebar-nav">
                    <NavLink to="/admin/event" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span className="nav-text">Event Management</span>
                    </NavLink>
                    
                    <NavLink to="/admin/tasks" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <span className="nav-text">Task Oversight</span>
                    </NavLink>
                    
                    <NavLink to="/admin/users" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span className="nav-text">Members & Perms</span>
                    </NavLink>
                    
                    <NavLink to="/admin/reports" className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"></path></svg>
                        <span className="nav-text">Reports</span>
                    </NavLink>
                </nav>
        </aside>
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

                        {isDropdownOpen && (
                            <div className="dropdown-menu" style={{ display: 'block', position: 'absolute', top: '100%', right: 0, zIndex: 100 }}>
                                <Link to="/admin/changepassword" className="dropdown-item">Change Password</Link>
                                <hr className="dropdown-divider" />
                                <a onClick={handleSignOut} className="dropdown-item text-error">Sign Out</a>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <div className="password-container">
                <Outlet />
             </div>
           
        </>
    );
}
export default Header;  
