import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

function AdminEventTimeline() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Tự động nhận diện Role dựa trên URL hiện tại
    const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/staff';

    const [timeline, setTimeline] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTimelineData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/timelines/events/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setTimeline(data.timeline);
                setItems(data.items || []);
            } else {
                setTimeline(null);
                setItems([]);
            }
        } catch (error) {
            console.error("Lỗi:", error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        document.title = "Quản lý lịch trình | TaskFlow";
        fetchTimelineData();
    }, [fetchTimelineData]);

    const handleCreateTimeline = async () => {
        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/timelines/events/${eventId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: `Lịch trình sự kiện #${eventId}`, description: 'Trục mốc thời gian sự kiện' })
            });
            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã khởi tạo khung lịch trình', showConfirmButton: false, timer: 1500 });
                fetchTimelineData();
            } else {
                const err = await response.json();
                Swal.fire('Thất bại', err.message, 'error');
            }
        } catch (e) { Swal.fire('Lỗi', 'Mất kết nối', 'error'); }
    };

    const handleDeleteItem = async (itemId) => {
        const result = await Swal.fire({
            title: 'Xóa mốc thời gian này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Đồng ý xóa'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const response = await fetch(`http://localhost:5000/api/timelines/items/${itemId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa mốc thời gian', showConfirmButton: false, timer: 1500 });
                    fetchTimelineData();
                } else {
                    const err = await response.json();
                    Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (e) { Swal.fire('Lỗi', 'Mất kết nối mạng', 'error'); }
        }
    };

    const formatPhase = (phase) => {
        if (phase === 'preparation') return '🔵 Chuẩn bị';
        if (phase === 'during_event') return '🟠 Diễn ra';
        return '🟢 Kết thúc';
    };

    if (loading) return <div className="text-center py-6">Đang tải dữ liệu lịch trình...</div>;

    const isClosed = timeline?.event_status === 'Đã kết thúc' || timeline?.event_status === 'Đã hủy';

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button className="btn-back" onClick={() => navigate(`${basePath}/events/view/${eventId}`)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Về chi tiết sự kiện
                </button>
                <h3>Quản lý lịch trình (Timeline)</h3>
            </div>

            {isClosed && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fdf2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontWeight: '600', marginBottom: '20px', fontSize: '14px' }}>
                    🔒 Sự kiện này đã {timeline?.event_status.toLowerCase()}. Toàn bộ lịch trình đã bị đóng băng ở chế độ chỉ đọc.
                </div>
            )}

            {!timeline ? (
                <div className="form-card text-center" style={{ padding: '40px', maxWidth: '100%' }}>
                    <p className="text-secondary mb-4">Sự kiện chưa có khung lịch trình tổng quát.</p>
                    <button className="btn-primary" onClick={handleCreateTimeline}>Khởi tạo lịch trình ngay</button>
                </div>
            ) : (
                <div className="form-card large" style={{ maxWidth: '100%', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h4 style={{ margin: 0 }}>Danh sách các mốc thời gian ({items.length})</h4>
                        
                        {/* NÚT THÊM - CHUYỂN HƯỚNG TRANG */}
                        {!isClosed && (
                            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => navigate(`${basePath}/timelines/${timeline.id}/items/add`)}>
                                + Thêm mốc mới
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <p className="text-center text-secondary font-style-italic">Trục thời gian chưa có mốc lịch trình nào.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                                        <th style={{ padding: '12px' }}>Giai đoạn</th>
                                        <th style={{ padding: '12px' }}>Tiêu đề mốc</th>
                                        <th style={{ padding: '12px' }}>Thời gian</th>
                                        <th style={{ padding: '12px' }}>Việc liên kết</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '12px', fontWeight: '500' }}>{formatPhase(item.phase)}</td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{item.description || 'Không có mô tả'}</div>
                                            </td>
                                            <td style={{ padding: '12px', color: '#475569', fontSize: '13px' }}>
                                                {new Date(item.start_time).toLocaleString('vi-VN')} <br/>đến {new Date(item.end_date).toLocaleString('vi-VN')}
                                            </td>
                                            <td style={{ padding: '12px', color: '#2563eb' }}>
                                                {item.task_id ? `[#${item.task_id}] ${item.task_title}` : <span style={{ color: '#94a3b8' }}>Không đính kèm</span>}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                {isClosed ? (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Đã khóa</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                                        
                                                        {/* NÚT SỬA - CHUYỂN HƯỚNG TRANG */}
                                                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '13px' }} onClick={() => navigate(`${basePath}/timelines/items/edit/${item.id}`)}>Sửa</button>
                                                        
                                                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '13px', backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteItem(item.id)}>Xóa</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminEventTimeline;