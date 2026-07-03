import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- STATE CHO BỘ LỌC ---
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [leaderId, setLeaderId] = useState('');

    const [currentOfficialPage, setCurrentOfficialPage] = useState(1);
    const [currentDraftPage, setCurrentDraftPage] = useState(1);
    const eventsPerPage = 10; 

    // --- HÀM GỌI API LỌC TỪ BACKEND ---
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            
            if (status) queryParams.append('status', status);
            if (fromDate) queryParams.append('from_date', fromDate);
            if (toDate) queryParams.append('to_date', toDate);
            if (leaderId) queryParams.append('leader_id', leaderId);

            const response = await fetch(`http://localhost:5000/api/events?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            setEvents(data.events || data); 
        } catch (err) { 
            console.error("Lỗi khi tải danh sách sự kiện:", err); 
        } finally { 
            setLoading(false); 
        }
    }, [status, fromDate, toDate, leaderId]);

    useEffect(() => {
        document.title = "Quản lý Sự kiện | TaskFlow";
        setCurrentOfficialPage(1);
        setCurrentDraftPage(1);
        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchEvents]); 

    // Khôi phục bộ lọc
    const handleReset = () => {
        setStatus('');
        setFromDate('');
        setToDate('');
        setLeaderId('');
    };

    const handleCardClick = (id) => navigate(`/admin/events/view/${id}`);

    // Tách mảng để hiển thị giao diện
    const officialEvents = events
        .filter(event => event.status !== 'Nháp')
        .sort((a, b) => {
            if (a.status === 'Đã hủy' && b.status !== 'Đã hủy') return 1;
            if (a.status !== 'Đã hủy' && b.status === 'Đã hủy') return -1;
            return new Date(a.start_date) - new Date(b.start_date);
        });
    
    const draftEvents = events
        .filter(event => event.status === 'Nháp')
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Phân trang
    const indexOfLastOfficial = currentOfficialPage * eventsPerPage;
    const currentOfficialEvents = officialEvents.slice(indexOfLastOfficial - eventsPerPage, indexOfLastOfficial);
    const totalOfficialPages = Math.ceil(officialEvents.length / eventsPerPage);

    const indexOfLastDraft = currentDraftPage * eventsPerPage;
    const currentDraftEvents = draftEvents.slice(indexOfLastDraft - eventsPerPage, indexOfLastDraft);
    const totalDraftPages = Math.ceil(draftEvents.length / eventsPerPage);

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Quản lý Sự kiện</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => navigate('/admin/events/add')} >
                        + Thêm sự kiện
                    </button>
                </div>
            </div>

            {/* --- GIAO DIỆN BỘ LỌC TÌM KIẾM --- */}
            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 150px' }}>
                        <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="Sắp diễn ra">Sắp diễn ra</option>
                            <option value="Đang diễn ra">Đang diễn ra</option>
                            <option value="Đã kết thúc">Đã kết thúc</option>
                            <option value="Đã hủy">Đã hủy</option>
                            <option value="Nháp">Bản nháp</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                                <input 
                                    type={toDate ? 'date' : 'text'} 
                                    placeholder="Đến ngày..." 
                                    className="form-input" 
                                    value={toDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setToDate(e.target.value)} 
                                    style={{ padding: '6px 30px 6px 12px', height: '36px', width: '100%' }} 
                                />                   
                     </div>
                    <div style={{ flex: '1 1 140px' }}>
                        <input 
                                    type={toDate ? 'date' : 'text'} 
                                    placeholder="Đến ngày..." 
                                    className="form-input" 
                                    value={toDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setToDate(e.target.value)} 
                                    style={{ padding: '6px 30px 6px 12px', height: '36px', width: '100%' }} 
                                />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                        <input type="text" className="form-input" placeholder="ID người phụ trách" value={leaderId} onChange={(e) => setLeaderId(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                        <button type="button" className="btn-secondary" onClick={handleReset}>Xóa lọc</button>
                    </div>
                </div>
            </div>
            
            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu...</div>
            ) : events.length === 0 ? (
                <div className="text-center text-secondary mb-6 form-card">Không tìm thấy sự kiện nào khớp với bộ lọc.</div>
            ) : (
                <>
                    <div className="mb-6" style={{ marginTop: '32px' }}>
                        <h3 className="section-title">Sự kiện chính thức</h3>
                        {currentOfficialEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card" style={{ maxWidth: '100%' }}>Không có dữ liệu.</div>
                        ) : (
                            <>
                                <div className="event-grid">
                                    {currentOfficialEvents.map(event => (
                                        <div key={event.id} className="event-card" onClick={() => handleCardClick(event.id)} style={{ cursor: 'pointer' }}>
                                            <div className="event-card-header">
                                                <span className={`status-badge ${event.status === 'Đã hủy' ? 'status-inactive' : 'status-active'}`}>{event.status}</span>
                                            </div>
                                            <h2 className="event-title">{event.title}</h2>
                                            <p className="event-detail-row">📍 {event.location}</p>
                                            <p className="event-detail-row">🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    ))}
                                </div>
                                {officialEvents.length > eventsPerPage && (
                                    <div className="pagination-container">
                                        <button className="btn-page" disabled={currentOfficialPage === 1} onClick={() => setCurrentOfficialPage(currentOfficialPage - 1)}>Trước</button>
                                        {Array.from({ length: totalOfficialPages }, (_, i) => i + 1).map(page => (
                                            <button key={page} className={`btn-page ${currentOfficialPage === page ? 'active' : ''}`} onClick={() => setCurrentOfficialPage(page)}>{page}</button>
                                        ))}
                                        <button className="btn-page" disabled={currentOfficialPage === totalOfficialPages} onClick={() => setCurrentOfficialPage(currentOfficialPage + 1)}>Sau</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <h3 className="section-title warning">Bản nháp</h3>
                        {currentDraftEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card" style={{ maxWidth: '100%' }}>Không có dữ liệu.</div>
                        ) : (
                            <>
                                <div className="event-grid">
                                    {currentDraftEvents.map(event => (
                                        <div key={event.id} className="event-card" onClick={() => handleCardClick(event.id)} style={{ cursor: 'pointer' }}>
                                            <h2 className="event-title">{event.title}</h2>
                                            <p className="event-detail-row">📍 {event.location}</p>
                                            <p className="event-detail-row">🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    ))}
                                </div>
                                {draftEvents.length > eventsPerPage && (
                                    <div className="pagination-container">
                                        <button className="btn-page" disabled={currentDraftPage === 1} onClick={() => setCurrentDraftPage(currentDraftPage - 1)}>Trước</button>
                                        {Array.from({ length: totalDraftPages }, (_, i) => i + 1).map(page => (
                                            <button key={page} className={`btn-page ${currentDraftPage === page ? 'active' : ''}`} onClick={() => setCurrentDraftPage(page)}>{page}</button>
                                        ))}
                                        <button className="btn-page" disabled={currentDraftPage === totalDraftPages} onClick={() => setCurrentDraftPage(currentDraftPage + 1)}>Sau</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default EventList;