import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function RegistrationList() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [registrations, setRegistrations] = useState([]);
    const [eventInfo, setEventInfo] = useState(null);
    const [summary, setSummary] = useState({ confirmed: 0, cancelled: 0 });
    const [loading, setLoading] = useState(true);
    
    // State cho tìm kiếm và bộ lọc
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Hiệu ứng delay khi gõ tìm kiếm
    useEffect(() => {
        const timerId = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timerId);
    }, [search]);

    // Gọi API lấy danh sách đăng ký
    const fetchRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            
            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (filterStatus) queryParams.append('status', filterStatus);

            const url = `http://localhost:5000/api/events/${eventId}/registrations?${queryParams.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setRegistrations(data.registrations || []);
                setEventInfo(data.event);
                setSummary(data.summary || { confirmed: 0, cancelled: 0 });
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể tải danh sách', 'error');
            }
        } catch (error) {
            Swal.fire('Lỗi mạng', 'Không thể kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, [eventId, debouncedSearch, filterStatus]);

    useEffect(() => {
        document.title = "Danh sách khách đăng ký | TaskFlow";
        fetchRegistrations();
    }, [fetchRegistrations]);

    // 🟢 HÀM MỚI: XỬ LÝ KHI BẤM NÚT "HỦY VÉ"
    const handleCancelRegistration = async (registrationId, guestName) => {
        const result = await Swal.fire({
            title: `Hủy vé của ${guestName}?`,
            text: "Thao tác này sẽ chuyển trạng thái của khách thành 'Đã hủy' và giải phóng 1 chỗ trống cho sự kiện.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Đồng ý hủy',
            cancelButtonText: 'Đóng'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('my_token');
                const response = await fetch(`http://localhost:5000/api/events/${eventId}/registrations/${registrationId}/cancel`, {
                    method: 'PATCH', // Đảm bảo Backend dùng app.patch() hoặc router.patch()
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Đã hủy vé thành công',
                        showConfirmButton: false,
                        timer: 1500
                    });
                    // Gọi lại API để cập nhật bảng danh sách
                    fetchRegistrations();
                } else {
                    Swal.fire('Thất bại', data.message || 'Không thể hủy vé này', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi mạng', 'Không thể kết nối đến máy chủ', 'error');
            }
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    };

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Quay lại
                    </button>
                    <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>
                        Danh sách khách đăng ký
                    </h3>
                    {eventInfo && (
                        <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Sự kiện: <strong style={{ color: 'var(--primary-color)' }}>{eventInfo.title}</strong>
                        </p>
                    )}
                </div>

                {/* Ô tìm kiếm & Bộ lọc */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '260px' }}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tìm tên, email, SĐT..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '36px', height: '40px' }}
                        />
                        <svg style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select 
                        className="form-input" 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ height: '40px', width: '160px', cursor: 'pointer' }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="confirmed">Đã xác nhận ({summary.confirmed || 0})</option>
                        <option value="cancelled">Đã hủy ({summary.cancelled || 0})</option>
                    </select>
                </div>
            </div>

            <div className="form-card large" style={{ maxWidth: '100%', padding: '24px', margin: 0 }}>
                {loading ? (
                    <p className="text-center text-secondary">Đang tải dữ liệu...</p>
                ) : registrations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
                            {search || filterStatus ? 'Không tìm thấy khách nào khớp với bộ lọc.' : 'Chưa có ai đăng ký tham dự sự kiện này.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: '1000px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                                    <th>Khách hàng</th>
                                    <th>Liên hệ</th>
                                    <th>Đơn vị / Tổ chức</th>
                                    <th>Ghi chú</th>
                                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.map((reg, index) => (
                                    <tr key={reg.id} style={{ transition: 'background-color 0.2s', opacity: reg.status === 'cancelled' ? 0.6 : 1 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ textAlign: 'center', fontWeight: '500', color: '#64748b' }}>
                                            {index + 1}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{reg.full_name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{formatDateTime(reg.registered_at)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>{reg.email}</div>
                                            {reg.phone && <div style={{ fontSize: '13px', color: '#334155' }}>{reg.phone}</div>}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '14px', color: '#475569' }}>
                                                {reg.organization || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: '#475569', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={reg.note}>
                                                {reg.note || '-'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {reg.status === 'confirmed' ? (
                                                <span className="badge-pill badge-green">Đã xác nhận</span>
                                            ) : (
                                                <span className="badge-pill badge-gray">Đã hủy</span>
                                            )}
                                        </td>
                                        {/* 🟢 CỘT NÚT BẤM THAO TÁC */}
                                        {/* 🟢 CỘT NÚT BẤM THAO TÁC */}
                                        <td style={{ textAlign: 'center' }}>
                                            {reg.status === 'confirmed' ? (
                                                <button 
                                                    onClick={() => handleCancelRegistration(reg.id, reg.full_name)}
                                                    style={{ 
                                                        backgroundColor: '#fef2f2', 
                                                        border: '1px solid #fecaca', 
                                                        color: '#ef4444', 
                                                        fontWeight: '600', 
                                                        fontSize: '12px', 
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fee2e2';
                                                        e.currentTarget.style.borderColor = '#f87171';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fef2f2';
                                                        e.currentTarget.style.borderColor = '#fecaca';
                                                    }}
                                                >
                                                    Hủy vé
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                                            )}
                                        </td>
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