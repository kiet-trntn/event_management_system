import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- 1. STATE CHO BỘ LỌC TÌM KIẾM ---
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(''); // State phụ để trì hoãn gõ phím
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [currentOfficialPage, setCurrentOfficialPage] = useState(1);
    const [currentDraftPage, setCurrentDraftPage] = useState(1);
    const eventsPerPage = 10; 

    // --- 2. KỸ THUẬT DEBOUNCE CHỐNG LAG SERVER ---
    // Cứ mỗi khi bạn gõ chữ vào ô 'search', đợi 0.5s sau nó mới cập nhật vào 'debouncedSearch'
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500); 

        return () => clearTimeout(timerId); // Dọn dẹp timer nếu người dùng gõ tiếp
    }, [search]);

    // --- 3. HÀM GỌI API KÈM THEO QUERY TÌM KIẾM ---
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            
            // Lấy các giá trị hiện tại để gửi xuống Backend[cite: 4]
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (status) queryParams.append('status', status);
            if (fromDate) queryParams.append('from_date', fromDate);
            if (toDate) queryParams.append('to_date', toDate);

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
    };

    // --- 4. TỰ ĐỘNG LỌC KHI CÓ THAY ĐỔI ---
    // Bất cứ khi nào 4 biến này thay đổi, tự động bẻ trang về 1 và gọi API tìm kiếm
    useEffect(() => {
        document.title = "Quản lý Sự kiện | TaskFlow";
        setCurrentOfficialPage(1);
        setCurrentDraftPage(1);
        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, status, fromDate, toDate]); 

    // --- 5. NÚT KHÔI PHỤC (RESET) ---
    const handleReset = () => {
        setSearch(''); // Xóa nội dung tìm kiếm hiển thị
        setDebouncedSearch(''); // Xóa nội dung tìm kiếm ngầm
        setStatus('');
        setFromDate('');
        setToDate('');
    };

    const handleCardClick = (id) => navigate(`/admin/events/view/${id}`);

    // Phân loại sự kiện
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

    // Tính toán phân trang
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

            {/* --- 6. GIAO DIỆN BỘ LỌC TÌM KIẾM (Đã bỏ form và nút submit) --- */}
            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="form-label" style={{ marginBottom: '6px' }}>Tìm kiếm</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tên sự kiện, địa điểm..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label className="form-label" style={{ marginBottom: '6px' }}>Trạng thái</label>
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
                        <label className="form-label" style={{ marginBottom: '6px' }}>Từ ngày</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            value={fromDate} 
                            onChange={(e) => setFromDate(e.target.value)} 
                        />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                        <label className="form-label" style={{ marginBottom: '6px' }}>Đến ngày</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            value={toDate} 
                            onChange={(e) => setToDate(e.target.value)} 
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                        {/* Đã bỏ nút Lọc, chỉ giữ lại nút Khôi phục */}
                        <button type="button" className="btn-secondary" onClick={handleReset}>Khôi phục</button>
                    </div>
                </div>
            </div>
            {/* --- KẾT THÚC BỘ LỌC --- */}
            
            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu...</div>
            ) : (
                <>
                    {/* Hiển thị Sự Kiện Chính Thức */}
                    <div className="mb-6" style={{ marginTop: '32px' }}>
                        <h3 className="section-title">Sự kiện chính thức</h3>
                        
                        {currentOfficialEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card" style={{ maxWidth: '100%' }}>Không tìm thấy sự kiện chính thức nào.</div>
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

                    {/* Hiển thị Bản Nháp */}
                    <div>
                        <h3 className="section-title warning">Bản nháp</h3>
                        
                        {currentDraftEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card" style={{ maxWidth: '100%' }}>Không tìm thấy bản nháp nào.</div>
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