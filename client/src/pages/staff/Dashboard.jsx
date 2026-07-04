import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function Dashboard() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [leaderPendingTasks, setLeaderPendingTasks] = useState([]);
    const [isLeader, setIsLeader] = useState(false); 
    const [loading, setLoading] = useState(true);
    
    const getTokenUser = () => {
        const token = localStorage.getItem('my_token');
        if (!token) return null;
        try { return JSON.parse(window.atob(token.split('.')[1])); } 
        catch (e) { return null; }
    };
    const currentUser = getTokenUser();
    const rolePath = currentUser?.role === 'admin' ? 'admin' : 'staff';

    // Tối ưu hóa: Lọc dữ liệu biểu đồ dựa trên vai trò (Leader xem tổng thể, Staff xem cá nhân)
    const { taskStats, eventStats, COLORS } = useMemo(() => {
        const taskStatusList = [
            { id: 'pending', name: 'Chờ xử lý' },
            { id: 'in_progress', name: 'Đang tiến hành' },
            { id: 'submitted', name: 'Chờ phê duyệt' },
            { id: 'completed', name: 'Đã hoàn thành' },
            { id: 'cancelled', name: 'Đã hủy' }
        ];

        // Nếu là leader/admin thì thống kê trên cụm 'tasks' tổng, nếu là staff thì thống kê trên cụm 'myTasks' cá nhân
        const targetTasks = isLeader ? tasks : myTasks;

        const taskStatsData = taskStatusList.map(status => ({
            name: status.name,
            value: targetTasks.filter(t => t.status === status.id).length
        })).filter(item => item.value > 0);

        const eventStatusList = [
            { id: 'Nháp', name: 'Nháp' },
            { id: 'Sắp diễn ra', name: 'Sắp diễn ra' },
            { id: 'Đang diễn ra', name: 'Đang diễn ra' },
            { id: 'Đã kết thúc', name: 'Đã kết thúc' },
            { id: 'Đã hủy', name: 'Đã hủy' }
        ];

        const eventStatsData = eventStatusList.map(status => ({
            name: status.name,
            value: events.filter(e => e.status === status.id).length
        })).filter(item => item.value > 0);

        return {
            taskStats: taskStatsData,
            eventStats: eventStatsData,
            COLORS: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b']
        };
    }, [tasks, myTasks, events, isLeader]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [eventsRes, tasksRes, myTasksRes, pendingRes] = await Promise.all([
                fetch('http://localhost:5000/api/events', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/tasks', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/tasks/my-tasks', { headers }).catch(() => null),
                fetch('http://localhost:5000/api/task-submissions/pending', { headers }).catch(() => null)
            ]);

            const eventsData = (eventsRes && eventsRes.ok) ? await eventsRes.json() : { events: [] };
            const tasksData = (tasksRes && tasksRes.ok) ? await tasksRes.json() : { tasks: [] };
            const myTasksData = (myTasksRes && myTasksRes.ok) ? await myTasksRes.json() : { tasks: [] };
            const pendingData = (pendingRes && pendingRes.ok) ? await pendingRes.json() : { submissions: [] };
            
            setEvents(eventsData.events || []);
            setTasks(tasksData.tasks || []);
            setMyTasks(myTasksData.tasks || []);
            setLeaderPendingTasks(pendingData.submissions || []);
            
            // LOGIC KIỂM TRA LEADER MỚI:
            if (currentUser?.role === 'admin') {
                setIsLeader(true);
            } else {
                // Kiểm tra xem user hiện tại có phải là leader của event thông qua event_leader_id không
                const isManagingAnyEvent = (tasksData.tasks || []).some(
                    task => task.event_leader_id === currentUser?.id
                );
                
                setIsLeader(isManagingAnyEvent);
            }

        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.role, currentUser?.id]);

    useEffect(() => {
        document.title = "Tổng quan | TaskFlow";
        fetchDashboardData();
    }, [fetchDashboardData]);

    const totalEvents = events.length;
    const totalTasks = myTasks.length;
    const pendingTasks = myTasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = myTasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = myTasks.filter(t => t.status === 'completed').length;
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const urgentTasks = myTasks
        .filter(t => !['completed', 'cancelled', 'submitted'].includes(t.status))
        .sort((a, b) => (b.priority === 'high' ? 1 : -1))
        .slice(0, 3);

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

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%', marginBottom: '24px' }}>
                <h3>Tổng Quan Công Việc</h3>
                <p className="text-secondary" style={{ fontSize: '14px', marginTop: '4px' }}>
                    Chào mừng bạn trở lại! Dưới đây là tiến độ công việc hiện tại của bạn.
                </p>
            </div>

            {loading ? (
                <div className="form-card text-center text-secondary">Đang thống kê dữ liệu...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* HÀNG 1: Các số liệu đếm số lượng */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>SỰ KIỆN THAM GIA</div>
                            <div className="text-2xl font-semibold text-brand" style={{ marginTop: '8px' }}>{totalEvents}</div>
                        </div>
                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>CÔNG VIỆC ĐƯỢC GIAO</div>
                            <div className="text-2xl font-semibold" style={{ marginTop: '8px', color: 'var(--text-primary)' }}>{totalTasks}</div>
                        </div>
                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>VIỆC ĐANG LÀM</div>
                            <div className="text-2xl font-semibold text-warning" style={{ marginTop: '8px' }}>{inProgressTasks + pendingTasks}</div>
                        </div>
                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>VIỆC ĐÃ HOÀN THÀNH</div>
                            <div className="text-2xl font-semibold text-success" style={{ marginTop: '8px' }}>{completedTasks}</div>
                        </div>
                    </div>

                    {/* HÀNG 2: Tiến độ cá nhân & Việc cần làm ngay (Nhân viên thường + Leader đều nhìn thấy cái này) */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                        <div className="form-card large" style={{ flex: '1 1 40%', margin: 0, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <h3 className="section-title" style={{ width: '100%', borderLeftColor: 'var(--secondary-color)' }}>Hiệu Suất Cá Nhân</h3>
                            <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '1px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0' }}>
                                <span className="text-2xl font-semibold text-brand">{overallProgress}%</span>
                            </div>
                            <div style={{ width: '100%', marginTop: '12px' }}>
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', backgroundColor: 'var(--success-color)', width: `${overallProgress}%`, transition: 'width 0.5s ease' }} />
                                </div>
                                <p className="text-center text-secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
                                    Đã hoàn thành {completedTasks}/{totalTasks} công việc được giao
                                </p>
                            </div>
                        </div>

                        <div className="form-card large" style={{ flex: '1 1 55%', margin: 0, padding: '24px' }}>
                            <h3 className="section-title">Nhiệm Vụ Cần Làm Ngay</h3>
                            {urgentTasks.length === 0 ? (
                                <p className="text-center text-secondary" style={{ padding: '40px 0' }}>🎉 Tuyệt vời! Bạn không có công việc nào bị tồn đọng.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                                    {urgentTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => navigate(`/${rolePath}/tasks/view/${task.id}`)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid var(--border-neutral)', borderRadius: '8px', backgroundColor: 'var(--bg-neutral)', cursor: 'pointer', transition: 'transform 0.1s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600' }}>{task.title}</h4>
                                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    Sự kiện: <span className="text-brand font-medium">{task.event_title || 'Tên sự kiện'}</span>
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', ...getSelectStyle(task.status) }}>
                                                    {renderTaskStatusText(task.status)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không hạn'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HÀNG 3: DÀNH RIÊNG CHO LEADER (Ẩn hoàn toàn nếu isLeader = false) */}
                    {isLeader && (
                        <>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b' }}>Thống kê Trạng thái Công việc</h4>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={taskStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                    {taskStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} công việc`, 'Số lượng']} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b' }}>Trạng thái Sự kiện Quản lý</h4>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={eventStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Số lượng" barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="form-card large" style={{ margin: 0, padding: '24px', maxWidth: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                                        Minh chứng chờ phê duyệt
                                    </h3>
                                    <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                        {leaderPendingTasks.length} yêu cầu mới
                                    </span>
                                </div>
                                
                                {leaderPendingTasks.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 0', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                        <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic', fontWeight: '500' }}>Hiện tại chưa có minh chứng nào cần bạn phê duyệt.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {leaderPendingTasks.slice(0, 5).map(sub => (
                                            <div 
                                                key={sub.id} 
                                                onClick={() => navigate(`/${rolePath}/tasks/view/${sub.task_id}`)}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <div>
                                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>{sub.task_title}</div>
                                                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                                                        Người nộp: <strong style={{ color: '#475569' }}>{sub.submitted_by_name}</strong> • Sự kiện: {sub.event_title}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/${rolePath}/tasks/view/${sub.task_id}`); }}
                                                    style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                >
                                                    Xem & Duyệt
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>
            )}
        </div>
    );
}

export default Dashboard;