import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function RegistrationList() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            if (statusFilter) query.append('status', statusFilter);

            const response = await fetch(`http://localhost:5000/api/events/${eventId}/registrations?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Chặn nhân viên không có quyền
            if (response.status === 403) {
                Swal.fire('Từ chối truy cập', 'Bạn không có quyền xem danh sách của sự kiện này.', 'error')
                    .then(() => navigate(-1));
                return;
            }
            
            const result = await response.json();
            if (response.ok) {
                setData(result);
            } else {
                Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Mất kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [eventId, search, statusFilter, navigate]);

    useEffect(() => {
        document.title = "Danh sách đăng ký | TaskFlow";
        fetchData();
    }, [fetchData]);

    const renderStatus = (status) => {
        const styles = {
            'pending': { label: 'Chờ xử lý', color: '#f59e0b', bg: '#fef3c7' },
            'confirmed': { label: 'Đã xác nhận', color: '#10b981', bg: '#d1fae5' },
            'rejected': { label: 'Từ chối', color: '#ef4444', bg: '#fee2e2' },
            'checked_in': { label: 'Đã Check-in', color: '#3b82f6', bg: '#dbeafe' },
            'cancelled': { label: 'Đã hủy', color: '#64748b', bg: '#f1f5f9' }
        };
        const s = styles[status] || styles['pending'];
        return (
            <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600', color: s.color, backgroundColor: s.bg }}>
                {s.label}
            </span>
        );
    };

    if (loading) return <div className="page-container"><div className="form-card text-center text-secondary">⏳ Đang tải dữ liệu...</div></div>;
    if (!data) return null;

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Về chi tiết sự kiện
                </button>
                <h3>Danh sách khách đăng ký</h3>
            </div>

            <div className="form-card large" style={{ maxWidth: '100%', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{data.event.title}</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Tổng số người đăng ký: <strong>{data.total}</strong></p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tìm tên, email, sđt..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px', width: '200px' }}
                        />
                        <select 
                            className="form-input" 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="confirmed">Đã xác nhận</option>
                            <option value="checked_in">Đã Check-in</option>
                            <option value="rejected">Đã từ chối</option>
                        </select>
                    </div>
                </div>

                {data.registrations.length === 0 ? (
                    <p className="text-center text-secondary font-style-italic" style={{ padding: '20px 0' }}>Không tìm thấy dữ liệu đăng ký nào.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 16px', color: '#475569' }}>Khách hàng</th>
                                    <th style={{ padding: '12px 16px', color: '#475569' }}>Liên hệ</th>
                                    <th style={{ padding: '12px 16px', color: '#475569' }}>Tổ chức</th>
                                    <th style={{ padding: '12px 16px', color: '#475569' }}>Ghi chú</th>
                                    <th style={{ padding: '12px 16px', color: '#475569' }}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.registrations.map(reg => (
                                    <tr key={reg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{reg.full_name}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ color: '#0f172a' }}>{reg.email}</div>
                                            {reg.phone && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{reg.phone}</div>}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{reg.organization || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {reg.note || '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>{renderStatus(reg.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RegistrationList;