import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ManagerDashboard() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('my_token');
        const tasksRes = await fetch('http://localhost:5000/api/tasks', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });

        if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            setTasks(tasksData.tasks || []);
        } else {
            Swal.fire('Lỗi', 'Không thể tải dữ liệu tổng quan quản lý', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
    } finally {
        setLoading(false);
    }
}, []);

    useEffect(() => {
        document.title = "Tổng quan Quản lý | TaskFlow";
        fetchDashboardData();
    }, [fetchDashboardData]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    // 1. Lọc công việc đang chờ phê duyệt (submitted)
    const pendingApprovalTasks = tasks.filter(t => t.status === 'submitted');

    // 2. Lọc công việc đang quá hạn (Chưa xong & Hạn chót < Hôm nay)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đưa về đầu ngày để so sánh chuẩn

    const overdueTasks = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed' || t.status === 'cancelled' || t.status === 'submitted') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    });

    // Lấy tối đa 5 việc chờ duyệt để hiển thị trên bảng điều khiển
    const recentSubmissions = pendingApprovalTasks.slice(0, 5);

    // Tính % tiến độ dự án
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="page-container">
            
            {/* Header tổng quan */}
            <div className="page-header-form" style={{ maxWidth: '100%', marginBottom: '24px' }}>
                <h3>Bảng Điều Khiển Quản Lý</h3>
                <p className="text-secondary" style={{ fontSize: '14px', marginTop: '4px' }}>
                    Theo dõi tiến độ tổng thể, phê duyệt kết quả và kiểm soát rủi ro chậm trễ.
                </p>
            </div>

            {loading ? (
                <div className="form-card text-center text-secondary">Đang thống kê dữ liệu hệ thống...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* --- 1. KHU VỰC THẺ ĐẾM SỐ LIỆU (STAT CARDS) --- */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                        
                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>TỔNG CÔNG VIỆC</div>
                            <div className="text-2xl font-semibold" style={{ marginTop: '8px', color: '#1e293b' }}>{totalTasks}</div>
                        </div>

                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>CHỜ PHÊ DUYỆT</div>
                            <div className="text-2xl font-semibold" style={{ marginTop: '8px', color: '#b45309' }}>{pendingApprovalTasks.length}</div>
                        </div>

                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>ĐANG QUÁ HẠN</div>
                            <div className="text-2xl font-semibold" style={{ marginTop: '8px', color: '#b91c1c' }}>{overdueTasks.length}</div>
                        </div>

                        <div className="form-card" style={{ margin: 0, padding: '20px', maxWidth: '100%' }}>
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>ĐÃ HOÀN THÀNH</div>
                            <div className="text-2xl font-semibold" style={{ marginTop: '8px', color: '#047857' }}>{completedTasks}</div>
                        </div>

                    </div>

                    {/* --- 2. LAYOUT CHÍNH: DANH SÁCH DUYỆT & TRẠNG THÁI --- */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                        
                        {/* Thẻ Cần phê duyệt ngay (Bên trái, chiếm nhiều diện tích hơn) */}
                        <div className="form-card large" style={{ flex: '1 1 55%', margin: 0, padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                                <h3 className="section-title" style={{ margin: 0, border: 'none' }}>Nhiệm Vụ Chờ Phê Duyệt</h3>
                                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                                    {pendingApprovalTasks.length} yêu cầu
                                </span>
                            </div>
                            
                            {recentSubmissions.length === 0 ? (
                                <p className="text-center text-secondary" style={{ padding: '40px 0' }}>Không có minh chứng nào đang chờ bạn duyệt.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {recentSubmissions.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => navigate(`/admin/tasks/view/${task.id}`)}
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '16px', 
                                                border: '1px solid #e2e8f0', 
                                                borderRadius: '8px', 
                                                backgroundColor: '#fff',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
                                        >
                                            <div>
                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>{task.title}</h4>
                                                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                                                    <span>Nhân viên: <strong style={{ color: '#334155' }}>{task.assigned_name || 'Chưa rõ'}</strong></span>
                                                    <span>•</span>
                                                    <span>Sự kiện: {task.event_title}</span>
                                                </div>
                                            </div>

                                            <button style={{ padding: '8px 16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                                Xem & Duyệt
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Thẻ Cảnh báo & Tiến độ (Bên phải) */}
                        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Box Tiến độ dự án */}
                            <div className="form-card large" style={{ margin: 0, padding: '24px' }}>
                                <h3 className="section-title" style={{ borderLeftColor: '#10b981' }}>Tiến Độ Tổng Thể</h3>
                                
                                <div style={{ marginTop: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Tỷ lệ hoàn thành</span>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#047857' }}>{overallProgress}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', backgroundColor: '#10b981', width: `${overallProgress}%`, transition: 'width 0.8s ease' }} />
                                    </div>
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                                        Đã nghiệm thu {completedTasks} trên tổng số {totalTasks} công việc.
                                    </p>
                                </div>
                            </div>

                            {/* Box Cảnh báo quá hạn */}
                            <div className="form-card large" style={{ margin: 0, padding: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#b91c1c' }}>Cảnh Báo Quá Hạn</h3>
                                
                                {overdueTasks.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#15803d', fontWeight: '500' }}>Tất cả công việc đều đang đúng tiến độ.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {overdueTasks.slice(0, 3).map(task => (
                                            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{task.title}</p>
                                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>NV: {task.assigned_name || 'Trống'}</p>
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                                    Trễ hạn
                                                </span>
                                            </div>
                                        ))}
                                        {overdueTasks.length > 3 && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#dc2626', textAlign: 'center', cursor: 'pointer', fontWeight: '600' }}>
                                                + Xem thêm {overdueTasks.length - 3} công việc khác
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManagerDashboard;