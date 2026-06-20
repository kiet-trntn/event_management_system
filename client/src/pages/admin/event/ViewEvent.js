import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Chi tiết sự kiện | TOOF";
        const fetchEventDetail = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    setEvent(data);
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không tìm thấy sự kiện', 'error')
                        .then(() => navigate('/admin/events'));
                }
            } catch (error) {
                console.error("Lỗi khi tải chi tiết:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetail();
    }, [id, navigate]);

    const handlePublish = async () => {
        const result = await Swal.fire({
            title: 'Bạn chắc chắn muốn công bố?',
            text: "Sự kiện sẽ được chuyển sang trạng thái 'Sắp diễn ra'. Sau khi công bố, bạn sẽ không thể chỉnh sửa nội dung được nữa!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Vâng, Công bố ngay!',
            cancelButtonText: 'Để sau'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/publish`, {
                    method: 'PATCH', 
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Thành công!', 'Sự kiện đã được công bố.', 'success')
                        .then(() => {
                            navigate('/admin/events'); 
                        });
                } else {
                    Swal.fire('Thất bại!', data.message || 'Có lỗi xảy ra', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi hệ thống!', 'Không thể kết nối đến máy chủ', 'error');
            }
        }
    };

    if (loading) {
        return <div className="text-center text-secondary" style={{ padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    if (!event) return null;

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Chi tiết sự kiện</h3>
            </div>

            <div className="form-card large">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <h2 className="text-2xl font-semibold" style={{ margin: 0 }}>
                        {event.title}
                    </h2>
                    <span className={`status-badge ${event.status === 'Nháp' ? 'status-draft' : 'status-active'}`}>
                        {event.status}
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'var(--bg-neutral)', padding: '20px', borderRadius: '8px', marginBottom: '32px' }}>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>📍 Địa điểm tổ chức</p>
                        <p className="font-semibold">{event.location}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>👤 Người phụ trách (Leader)</p>
                        <p className="font-semibold">{event.leader_name || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>🕒 Thời gian bắt đầu</p>
                        <p className="font-semibold">{new Date(event.start_date).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>⏳ Thời gian kết thúc</p>
                        <p className="font-semibold">{new Date(event.end_date).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>👥 Số lượng tối đa</p>
                        <p className="font-semibold">{event.max_members} người</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-2" style={{ fontSize: '13px' }}>✍️ Người tạo</p>
                        <p className="font-semibold">{event.created_by_name || 'Admin'}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="font-semibold mb-2" style={{ fontSize: '16px' }}>Mô tả chi tiết</h4>
                    <p className="text-secondary" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {event.description}
                    </p>
                </div>

                {event.status === 'Nháp' && (
                    <>
                        <div className="event-divider"></div>
                        
                        <div className="form-actions">
                            <button 
                                className="btn-secondary" 
                                onClick={() => navigate(`/admin/events/edit/${event.id}`)}
                            >
                                Sửa sự kiện
                            </button>

                            <button 
                                className="btn-publish" 
                                onClick={handlePublish}
                            >
                                Công bố sự kiện
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default ViewEvent;