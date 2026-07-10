import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ViewEventAdmin() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Chi tiết sự kiện (Admin) | TaskFlow";
        const fetchEventDetail = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    setEvent(data.event || data);
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không tìm thấy sự kiện', 'error')
                        .then(() => navigate('/admin/events'));
                }
            } catch (error) {
                console.error("Lỗi khi tải chi tiết:", error);
                Swal.fire('Lỗi mạng', 'Không thể kết nối đến máy chủ', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetail();
    }, [id, navigate]);

    const handlePublish = async () => {
        const result = await Swal.fire({
            title: 'Bạn chắc chắn muốn công bố?',
            text: "Sự kiện sẽ được chuyển sang trạng thái 'Sắp diễn ra'. Sau khi công bố, nhân viên có thể bắt đầu nhận việc!",
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
            text: "Sự kiện sẽ được tạm ẩn và chuyển vào danh mục Thùng rác.",
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
                Swal.fire('Lỗi!', 'Không thể kết nối máy chủ.', 'error');
            }
        }
    };

    const handleCancel = async () => {
        const result = await Swal.fire({
            title: 'Hủy sự kiện này?',
            text: "Sự kiện sẽ chuyển sang trạng thái 'Đã hủy'. Trục lịch trình và công việc của sự kiện này sẽ bị khóa cứng dữ liệu!",
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
        return <div className="page-container event-page"><div className="form-card text-center text-secondary">⏳ Đang tải dữ liệu sự kiện...</div></div>;
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
                <h3>Chi tiết sự kiện (Quản trị viên)</h3>
            </div>

            <div className="form-card large">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <h2 className="text-2xl font-semibold" style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {event.title}
                    </h2>
                    <span className={event.status === 'Đã kết thúc' ? 'badge-pill badge-green' : event.status === 'Đang diễn ra' ? 'badge-pill badge-blue' : event.status === 'Đã hủy' ? 'badge-pill badge-gray' : 'badge-pill badge-yellow'}>
                        {event.status}
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Địa điểm tổ chức</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{event.location}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Người phụ trách (Leader)</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{event.leader_name || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Thời gian bắt đầu</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{new Date(event.start_date).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Thời gian kết thúc</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{new Date(event.end_date).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Số lượng tối đa</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{event.max_members} người</p>
                    </div>
                    <div>
                        <p className="text-secondary mb-1" style={{ fontSize: '13px', fontWeight: '500' }}>Người tạo sự kiện</p>
                        <p className="font-semibold" style={{ margin: 0, color: '#1e293b' }}>{event.created_by_name || 'Hệ thống Admin'}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="font-semibold mb-2" style={{ fontSize: '16px', color: '#0f172a' }}>Mô tả chi tiết sự kiện</h4>
                    <p className="text-secondary" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px' }}>
                        {event.description || 'Không có mô tả chi tiết.'}
                    </p>
                </div>

                {/* 🟢 THANH THAO TÁC NÚT BẤM (GỌN GÀNG TRÊN 1 HÀNG) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    
                    {/* KHỐI TRÁI: ĐIỀU HƯỚNG QUẢN LÝ */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button"
                            className="btn-secondary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', fontSize: '13px', color: '#334155' }}
                            onClick={() => navigate(`/admin/events/${event.id}/members`)}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {isEditable ? "Thành viên" : "Xem thành viên"}
                        </button>

                        <button 
                            type="button"
                            className="btn-secondary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', fontSize: '13px', backgroundColor: '#f1f5f9', color: '#334155' }}
                            onClick={() => navigate(`/admin/events/${event.id}/timeline`)}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Lịch trình
                        </button>
                    </div>

                    {/* KHỐI PHẢI: THAO TÁC SỰ KIỆN */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {event.status === 'Nháp' && (
                            <button type="button" className="btn-primary" style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6', height: '36px', padding: '0 16px', fontSize: '13px', color: '#fff' }} onClick={() => navigate(`/admin/events/edit/${event.id}`)}>Sửa</button>
                        )}

                        {event.status === 'Nháp' && (
                            <button type="button" className="btn-primary" style={{ backgroundColor: '#6B7280', borderColor: '#6B7280', height: '36px', padding: '0 16px', fontSize: '13px', color: '#fff' }} onClick={handleDelete}>Xóa</button>
                        )}

                        {(event.status !== 'Đã hủy' && event.status !== 'Đã kết thúc') && (
                            <button type="button" className="btn-primary" style={{ backgroundColor: '#EF4444', borderColor: '#EF4444', height: '36px', padding: '0 16px', fontSize: '13px', color: '#fff' }} onClick={handleCancel}>Hủy sự kiện</button>
                        )}

                        {event.status === 'Nháp' && (
                            <button type="button" className="btn-primary" style={{ backgroundColor: '#10B981', borderColor: '#10B981', height: '36px', padding: '0 16px', fontSize: '13px', color: '#fff' }} onClick={handlePublish}>Công bố</button>
                        )}
                    </div>
                </div>
                
            </div>
        </div>
    );
}

export default ViewEventAdmin;