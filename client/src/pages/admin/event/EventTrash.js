import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EventTrash() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tự động gọi API lấy danh sách thùng rác khi vào trang
    useEffect(() => {
        document.title = "Thùng rác Sự kiện | TOOF";
        fetchTrashEvents();
    }, []);

   // Hàm gọi API lấy danh sách sự kiện đã xóa mềm
    const fetchTrashEvents = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/events/trash', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Backend trả về res.json({ events: [...] }) nên ta bốc thẳng mảng data.events ra xài
                setEvents(data.events || []);
            } else {
                console.error("Backend báo lỗi:", data.message);
                setEvents([]);
            }
        } catch (err) {
            console.error("Lỗi khi gọi API thùng rác:", err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý bấm nút Khôi phục
    const handleRestore = async (id) => {
        const result = await Swal.fire({
            title: 'Khôi phục sự kiện?',
            text: "Sự kiện này sẽ được đưa trở lại danh sách quản lý chính thức.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Khôi phục ngay',
            cancelButtonText: 'Để sau'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/restore`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã khôi phục sự kiện về danh sách.', 'success');
                    setEvents(prevEvents => prevEvents.filter(ev => ev.id !== id));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể khôi phục sự kiện.', 'error');
                }
            } catch (error) {
                console.error("Lỗi khôi phục:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button type="button" className="btn-back" onClick={() => navigate('/admin/events')}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại danh sách
                </button>
                <h3>Thùng rác sự kiện</h3>
            </div>

            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu thùng rác...</div>
            ) : events.length === 0 ? (
                <div className="text-center text-secondary form-card mb-6" style={{ maxWidth: '100%' }}>
                    Thùng rác hiện tại đang trống.
                </div>
            ) : (
                <div className="event-grid">
                    {events.map(event => (
                        <div key={event.id} className="event-card" style={{ opacity: 0.75 }}>
                            <div className="event-card-header">
                                <span className="status-badge status-inactive">
                                    Đã xóa
                                </span>
                            </div>
                            
                            <h4 className="event-title text-secondary" >
                                {event.title}
                            </h4>
                            
                            <p className="event-detail-row">📍 {event.location}</p>
                            <p className="event-detail-row">🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
                            
                            <div className="event-divider"></div>
                            
                            <div className="event-actions">
                                <button className="btn-restore" title="Khôi phục sự kiện" onClick={() => handleRestore(event.id)}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EventTrash;