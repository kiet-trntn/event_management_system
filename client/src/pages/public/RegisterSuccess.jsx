import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function RegisterSuccess() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Đăng ký thành công | TaskFlow";
    }, []);

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ maxWidth: '500px', width: '100%', backgroundColor: '#fff', borderRadius: '12px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '70px', lineHeight: '1', marginBottom: '20px' }}>🎉</div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>Đăng ký thành công!</h2>
                <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                    Cảm ơn bạn đã đăng ký tham dự sự kiện. Thông tin chi tiết sẽ được ban tổ chức cập nhật qua Email hoặc Số điện thoại bạn đã cung cấp.
                </p>
                
                <button 
                    type="button"
                    className="btn-secondary" 
                    style={{ padding: '10px 20px', fontSize: '14px', width: '100%', justifyContent: 'center' }}
                    onClick={() => navigate(`/public/events/${eventId}/register`)}
                >
                    Quay lại form đăng ký
                </button>
            </div>
        </div>
    );
}

export default RegisterSuccess;