import React , { useEffect, useState } from 'react';
import {useNavigate} from 'react-router-dom';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [currentOfficialPage, setCurrentOfficialPage] = useState(1);
    const [currentDraftPage, setCurrentDraftPage] = useState(1);
    const eventsPerPage = 8; 

    useEffect(() => {
        document.title = "Quản lý Sự kiện | TaskFlow";
        const fetchEvents = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/events', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                setEvents(data.events || data); 
            } catch (err) { 
                console.error("Lỗi khi tải danh sách sự kiện:", err); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchEvents();
    }, []);

    const handleCardClick = (id) => navigate(`/admin/events/view/${id}`);

    // Sort: gần tới lên đầu, hủy xuống cuối
    const sortedOfficialEvents = events
        .filter(event => event.status !== 'Nháp')
        .sort((a, b) => {
            if (a.status === 'Đã hủy' && b.status !== 'Đã hủy') return 1;
            if (a.status !== 'Đã hủy' && b.status === 'Đã hủy') return -1;
            return new Date(a.start_date) - new Date(b.start_date);
        });
    
    const officialEvents = sortedOfficialEvents;
    const draftEvents = events
        .filter(event => event.status === 'Nháp')
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const indexOfLastOfficial = currentOfficialPage * eventsPerPage;
    const currentOfficialEvents = officialEvents.slice(indexOfLastOfficial - eventsPerPage, indexOfLastOfficial);
    const totalOfficialPages = Math.ceil(officialEvents.length / eventsPerPage);

    const indexOfLastDraft = currentDraftPage * eventsPerPage;
    const currentDraftEvents = draftEvents.slice(indexOfLastDraft - eventsPerPage, indexOfLastDraft);
    const totalDraftPages = Math.ceil(draftEvents.length / eventsPerPage);

    return (
        <div className="page-container event-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Quản lý Sự kiện</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => navigate('/admin/events/add')} >
                        + Thêm sự kiện
                    </button>
                </div>
                
            </div>
            
            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu...</div>
            ) : (
                <>
                    <div className="mb-6">
                        <h3 className="section-title">Sự kiện chính thức</h3>
                        
                        {currentOfficialEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card">Không có sự kiện chính thức nào.</div>
                        ) : (
                            <>
                                <div className="event-grid">
                                    {currentOfficialEvents.map(event => (
                                        <div key={event.id} className="event-card" onClick={() => handleCardClick(event.id)} style={{ cursor: 'pointer' }}>
                                            <div className="event-card-header">
                                                <span className={`status-badge ${event.status === 'Đã hủy' ? 'status-inactive' : 'status-active'}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            <h2 className="event-title">{event.title}</h2>
                                            <p className="event-detail-row">{event.location}</p>
                                            <p className="event-detail-row">{new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
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
                            <div className="text-center text-secondary form-card">Không có bản nháp nào.</div>
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