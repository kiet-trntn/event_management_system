import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Chi tiết sự kiện | TaskFlow";
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
                        .then(() => navigate('/admin/events'));
                } else {
                    Swal.fire('Thất bại!', data.message || 'Có lỗi xảy ra', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi hệ thống!', 'Không thể kết nối đến máy chủ', 'error');
            }
        }
    };

    const handleDelete = async () => { 
        const result = await Swal.fire({
            title: 'Chuyển vào thùng rác?',
            text: "Sự kiện sẽ được chuyển vào thùng rác và có thể khôi phục lại sau này.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/delete`, {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
    
                const data = await response.json();
                
                if (response.ok) {
                    Swal.fire('Đã xóa!', 'Sự kiện đã được đưa vào thùng rác.', 'success')
                        .then(() => navigate('/admin/events'));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể xóa sự kiện.', 'error');
                }
            } catch (error) {
                console.error("Lỗi xóa:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối máy chủ.', 'error');
            }
        }
    };

    const handleCancel = async () => {
        const result = await Swal.fire({
            title: 'Hủy sự kiện này?',
            text: "Sự kiện sẽ chuyển sang trạng thái 'Đã hủy'. Bạn có chắc chắn muốn thực hiện việc này không?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Đồng ý hủy',
            cancelButtonText: 'Đóng'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/cancel`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Đã hủy!', 'Sự kiện đã bị hủy thành công.', 'success')
                        .then(() => navigate('/admin/events'));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể hủy sự kiện.', 'error');
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

    const isEditable = (event.status === 'Nháp' || event.status === 'Sắp diễn ra');

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate('/admin/events')}>
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
                    <span className={`status-badge ${event.status === 'Nháp' ? 'status-draft' : event.status === 'Đã hủy' ? 'status-inactive' : 'status-active'}`}>
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

                <div className="event-divider"></div>
                
                <div className="form-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                        className="btn-secondary" 
                        style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => navigate(`/admin/events/${event.id}/members`)}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {isEditable ? "Quản lý thành viên" : "Xem thành viên"}
                    </button>

                    {event.status === 'Nháp' && (
                        <button 
                            className="btn-primary" 
                            style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6', color: '#fff' }} 
                            onClick={() => navigate(`/admin/events/edit/${event.id}`)}
                        >
                            Sửa
                        </button>
                    )}

                    {event.status === 'Nháp' && (
                        <button 
                            className="btn-primary" 
                            style={{ backgroundColor: '#6B7280', borderColor: '#6B7280', color: '#fff' }} 
                            onClick={handleDelete}
                        >
                            Xóa
                        </button>
                    )}

                    {(event.status !== 'Đã hủy' && event.status !== 'Đã kết thúc') && (
                        <button 
                            className="btn-primary" 
                            style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', color: '#fff' }} 
                            onClick={handleCancel}
                        >
                            Hủy
                        </button>
                    )}

                    {event.status === 'Nháp' && (
                        <button 
                            className="btn-primary" 
                            style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#fff' }} 
                            onClick={handlePublish}
                        >
                            Công bố sự kiện
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ViewEvent;