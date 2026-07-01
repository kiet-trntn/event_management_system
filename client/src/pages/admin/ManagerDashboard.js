import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ManagerDashboard() {
    const navigate = useNavigate();
    
    const [overview, setOverview] = useState({ total_events: 0, total_tasks: 0, completed_tasks: 0, pending_submissions: 0 });
    const [taskStats, setTaskStats] = useState([]);
    const [eventStats, setEventStats] = useState([]);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];
    const translateStatus = (status) => {
        const map = {
            'pending': 'Chờ xử lý', 'in_progress': 'Đang tiến hành', 'submitted': 'Chờ duyệt',
            'completed': 'Hoàn thành', 'cancelled': 'Đã hủy', 'Nháp': 'Nháp', 
            'Đang diễn ra': 'Đang diễn ra', 'Đã kết thúc': 'Đã kết thúc'
        };
        return map[status] || status;
    };

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [overviewRes, tasksRes, eventsRes, pendingRes] = await Promise.all([
                fetch('http://localhost:5000/api/reports/overview', { headers }),
                fetch('http://localhost:5000/api/reports/tasks', { headers }),
                fetch('http://localhost:5000/api/reports/events', { headers }),
                fetch('http://localhost:5000/api/task-submissions/pending', { headers })
            ]);

            if (overviewRes.ok && tasksRes.ok && eventsRes.ok) {
                const overviewData = await overviewRes.json();
                const tasksData = await tasksRes.json();
                const eventsData = await eventsRes.json();
                const pendingData = pendingRes.ok ? await pendingRes.json() : { submissions: [] };

                setOverview(overviewData);
                setTaskStats(tasksData.report.map(item => ({ name: translateStatus(item.status), value: item.total })));
                setEventStats(eventsData.report.map(item => ({ name: translateStatus(item.status), value: item.total })));
                setPendingTasks(pendingData.submissions.slice(0, 5));
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu báo cáo', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Báo cáo Quản trị | TaskFlow";
        fetchDashboardData();
    }, [fetchDashboardData]);

    const overallProgress = overview.total_tasks === 0 ? 0 : Math.round((overview.completed_tasks / overview.total_tasks) * 100);

    return (
        <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header-form" style={{ maxWidth: '100%', margin: '0 0 24px 0', textAlign: 'left' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Báo cáo & Thống kê Toàn hệ thống</h3>
                <p className="text-secondary" style={{ fontSize: '14px', marginTop: '8px', color: '#64748b' }}>
                    Góc nhìn tổng quan dành riêng cho Quản trị viên (Admin).
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Đang tải dữ liệu hệ thống...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>TỔNG SỰ KIỆN CÔNG TY</div>
                            <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#3b82f6' }}>{overview.total_events}</div>
                        </div>
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>TỔNG CÔNG VIỆC</div>
                            <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#1e293b' }}>{overview.total_tasks}</div>
                        </div>
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>CÔNG VIỆC HOÀN THÀNH</div>
                            <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#10b981' }}>{overview.completed_tasks}</div>
                        </div>
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: overview.pending_submissions > 0 ? '3px solid #f59e0b' : '' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>MINH CHỨNG CHỜ DUYỆT</div>
                            <div style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#d97706' }}>{overview.pending_submissions}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 400px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b' }}>Trạng thái Công việc (Tasks)</h4>
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
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b' }}>Trạng thái Sự kiện (Events)</h4>
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

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 600px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Minh chứng chờ phê duyệt</h4>
                                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                    {pendingTasks.length} yêu cầu mới
                                </span>
                            </div>
                            {pendingTasks.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontStyle: 'italic' }}>Chưa có minh chứng nào cần duyệt trên hệ thống.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {pendingTasks.map(sub => (
                                        <div 
                                            key={sub.id} 
                                            onClick={() => navigate(`/admin/tasks/view/${sub.task_id}`)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{sub.task_title}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                    Người nộp: <strong>{sub.submitted_by_name}</strong> • Sự kiện: {sub.event_title}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/tasks/view/${sub.task_id}`); }}
                                                style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                Xem & Duyệt
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: '1 1 300px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#1e293b' }}>Tiến độ hệ thống</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Tỷ lệ hoàn thành</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{overallProgress}%</span>
                            </div>
                            <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', backgroundColor: '#10b981', width: `${overallProgress}%`, transition: 'width 1s ease-in-out' }} />
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                                Đã nghiệm thu thành công <strong>{overview.completed_tasks}</strong> trên tổng số <strong>{overview.total_tasks}</strong> công việc toàn hệ thống.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagerDashboard;