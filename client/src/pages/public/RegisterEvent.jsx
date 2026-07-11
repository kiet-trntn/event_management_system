import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function RegisterEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        organization: '',
        note: ''
    });

    useEffect(() => {
        document.title = "Đăng ký tham dự sự kiện | TaskFlow";
        fetch(`http://localhost:5000/api/public/events/${eventId}`)
            .then(res => res.json())
            .then(data => {
                if (data.event) {
                    setEvent(data.event);
                } else {
                    Swal.fire('Thông báo', data.message || 'Sự kiện không tồn tại hoặc đã đóng đăng ký.', 'warning')
                        .then(() => navigate('/login'));
                }
            })
            .catch(() => Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ.', 'error'))
            .finally(() => setLoading(false));
    }, [eventId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch(`http://localhost:5000/api/public/events/${eventId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (res.ok) {
                navigate(`/public/events/${eventId}/success`);
            } else {
                Swal.fire('Đăng ký thất bại', data.message || 'Vui lòng kiểm tra lại thông tin.', 'error');
            }
        } catch (err) {
            Swal.fire('Lỗi hệ thống', 'Mất kết nối mạng, vui lòng thử lại sau.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '';
        const d = new Date(value);
        return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>⏳ Đang tải biểu mẫu...</div>;
    if (!event) return null;

    const pageWrapperStyle = {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#e1e7f0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box'
    };

    const cardStyle = {
        width: '100%',
        maxWidth: '520px', // 🔴 ĐÃ TĂNG LÊN 520PX CHO TO RỘNG HƠN ĐÚNG YÊU CẦU
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '40px 36px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px'
    };

    const reqStar = <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>;

    return (
        <div style={pageWrapperStyle}>
            
            {/* KHỐI HEADER SỬ DỤNG FILE LOGO RIÊNG */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
                <img 
                    src="/favicon.svg" 
                    alt="Logo TaskFlow"
                    className="login-logo" 
                    style={{ objectFit: 'cover' }} 
                />
                <h1 style={{ margin: 0, fontSize: '32px', color: '#2563EB', fontWeight: '900', letterSpacing: '1px' }}>
                    TASKFLOW
                </h1>
            </div>

            <div style={cardStyle}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#111827', lineHeight: '1.3' }}>
                        {event.title}
                    </h2>
                    <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                        Vui lòng nhập thông tin của bạn để đăng ký.
                    </p>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', fontSize: '13.5px', color: '#475569', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <strong style={{ color: '#111827', minWidth: '70px', flexShrink: 0 }}>Địa điểm:</strong> 
                        <span>{event.location}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: event.leader_name || event.description ? '8px' : '0' }}>
                        <strong style={{ color: '#111827', minWidth: '70px', flexShrink: 0 }}>Thời gian:</strong> 
                        <span>{formatDateTime(event.start_date)}</span>
                    </div>
                    {event.leader_name && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: event.description ? '8px' : '0' }}>
                            <strong style={{ color: '#111827', minWidth: '70px', flexShrink: 0 }}>👤 Phụ trách:</strong> 
                            <span>{event.leader_name}</span>
                        </div>
                    )}
                    {event.description && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                            <strong style={{ color: '#111827', display: 'block', marginBottom: '4px' }}>Giới thiệu sự kiện:</strong>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#475569' }}>{event.description}</p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Họ và tên {reqStar}</label>
                        <input type="text" className="form-input" required placeholder="Nhập họ và tên..." value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Địa chỉ Email {reqStar}</label>
                        <input type="email" className="form-input" required placeholder="Nhập địa chỉ email..." value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Số điện thoại</label>
                        <input type="tel" className="form-input" placeholder="Nhập số điện thoại..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Đơn vị / Tổ chức</label>
                        <input type="text" className="form-input" placeholder="Tên trường học, công ty..." value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '32px' }}>
                        <label style={labelStyle}>Ghi chú thêm</label>
                        <textarea className="form-input" rows="2" placeholder="Bạn có lời nhắn nào gửi đến BTC không?" style={{ resize: 'vertical' }} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                    </div>

                    <button type="submit" className="btn-submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đăng ký'}
                    </button>

                    <p style={{ marginTop: '24px', marginBottom: 0, fontSize: '12px', color: '#6B7280', textAlign: 'center', lineHeight: '1.5' }}>
                        Bằng cách đăng ký, bạn đồng ý với các Điều khoản & Chính sách Bảo mật của chúng tôi.
                    </p>
                </form>
            </div>
        </div>
    );
}

export default RegisterEvent;