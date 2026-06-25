import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Dashboard() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');

            // Gọi song song 2 API sẵn có để lấy số liệu tính toán ở Frontend
            const [eventsRes, tasksRes] = await Promise.all([
                fetch('http://localhost:5000/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (eventsRes.ok && tasksRes.ok) {
                const eventsData = await eventsRes.json();
                const tasksData = await tasksRes.json();
                setEvents(eventsData.events || []);
                setTasks(tasksData.tasks || []);
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu tổng quan', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Tổng quan | TaskFlow";
        fetchDashboardData();
    }, [fetchDashboardData]);

    // --- LOGIC XỬ LÝ SỐ LIỆU THỐNG KÊ BẰNG FRONTEND ---
    const totalEvents = events.length;
    const totalTasks = tasks.length;
    
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    // Tính % hoàn thành công việc chung
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Lấy ra tối đa 3 công việc chưa hoàn thành để nhắc nhở nhân viên làm ngay
    const urgentTasks = tasks
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => (b.priority === 'high' ? 1 : -1)) // Đẩy việc có độ ưu tiên cao lên trước để xử lý sớm
        .slice(0, 3);

    // Hàm lấy class badge chuẩn theo trạng thái từ style.css
    const getStatusBadgeClass = (status) => {
        switch(status) {
            case 'in_progress': return 'badge-pill badge-blue';
            case 'cancelled': return 'badge-pill badge-gray';
            default: return 'badge-pill badge-yellow'; // pending / Chờ xử lý
        }
    };

    // Hàm dịch trạng thái sang tiếng Việt tương ứng với select
    const getStatusLabel = (status) => {
        switch(status) {
            case 'in_progress': return 'Đang tiến hành';
            case 'cancelled': return 'Đã hủy';
            default: return 'Chờ xử lý'; // pending
        }
    };

    return (
        <div className="page-container">
            
            {/* Header tổng quan */}
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
                    
                    {/* --- 1. KHU VỰC THẺ ĐẾM SỐ LIỆU (STAT CARDS) --- */}
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
                            <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>VIỆC ĐA HOÀN THÀNH</div>
                            <div className="text-2xl font-semibold text-success" style={{ marginTop: '8px' }}>{completedTasks}</div>
                        </div>

                    </div>

                    {/* --- 2. LAYOUT CHÍNH: TIẾN ĐỘ CHUNG & VIỆC CHƯA XỬ LÝ --- */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                        
                        {/* Thẻ Tiến độ tổng thể (Trái) */}
                        <div className="form-card large" style={{ flex: '1 1 40%', margin: 0, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <h3 className="section-title" style={{ width: '100%', borderLeftColor: 'var(--secondary-color)' }}>Hiệu Suất Hoàn Thành</h3>
                            
                            {/* Vòng hiển thị số % lớn */}
                            <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '10px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0', position: 'relative' }}>
                                <span className="text-2xl font-semibold text-brand">{overallProgress}%</span>
                            </div>

                            {/* Thanh tiến độ phụ bổ trợ */}
                            <div style={{ width: '100%', marginTop: '12px' }}>
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', backgroundColor: 'var(--success-color)', width: `${overallProgress}%`, transition: 'width 0.5s ease' }} />
                                </div>
                                <p className="text-center text-secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
                                    Đã hoàn thành {completedTasks}/{totalTasks} tổng số công việc
                                </p>
                            </div>
                        </div>

                        {/* Thẻ Công việc cần làm ngay (Phải - Đã đồng bộ Status) */}
                        <div className="form-card large" style={{ flex: '1 1 55%', margin: 0, padding: '24px' }}>
                            <h3 className="section-title">Nhiệm Vụ Cần Làm Ngay</h3>
                            
                            {urgentTasks.length === 0 ? (
                                <p className="text-center text-secondary" style={{ padding: '40px 0' }}>🎉 Tuyệt vời! Bạn không có công việc nào bị tồn đọng.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                                    {urgentTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => navigate(`/staff/tasks/view/${task.id}`)}
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '14px 18px', 
                                                border: '1px solid var(--border-neutral)', 
                                                borderRadius: '8px', 
                                                backgroundColor: 'var(--bg-neutral)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s'
                                            }}
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
                                                <span className={getStatusBadgeClass(task.status)} style={{ fontSize: '12px', fontWeight: 'normal' }}>
                                                    {getStatusLabel(task.status)}
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
                </div>
            )}
        </div>
    );
}

export default Dashboard;