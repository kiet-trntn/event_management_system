import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import Swal from 'sweetalert2';

function Chat() {
    const [activeTab, setActiveTab] = useState('direct');
    const [conversations, setConversations] = useState([]);
    const [events, setEvents] = useState([]);            
   
    const [showNewChat, setShowNewChat] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchUser, setSearchUser] = useState('');

    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);

    const [unreadDMs, setUnreadDMs] = useState({});
    const [unreadEvents, setUnreadEvents] = useState({});

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Refs theo dõi UI để dùng trong Socket
    const activeTabRef = useRef(activeTab);
    const selectedChatRef = useRef(selectedChat);

    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

    const getCurrentUser = () => {
        const token = localStorage.getItem('my_token');
        if (!token) return null;
        try { return JSON.parse(window.atob(token.split('.')[1])); } catch (e) { return null; }
    };
    const currentUser = getCurrentUser();

    // HÀM FORMAT THỜI GIAN CHO KHUNG CHAT CHÍNH
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (diffMins < 1) return `${timeStr} • Vừa xong`;
        if (diffMins < 60) return `${timeStr} • ${diffMins} phút trước`;
        if (diffMins < 1440) return `${timeStr} • ${Math.floor(diffMins / 60)} giờ trước`;
        return `${timeStr} • ${date.toLocaleDateString('vi-VN')}`;
    };

    // HÀM FORMAT THỜI GIAN CHO SIDEBAR
    const formatSidebarTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ`;
        if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} ngày`;
        return date.toLocaleDateString('vi-VN');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchSidebarData = useCallback(async () => {
        const token = localStorage.getItem('my_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            if (activeTab === 'direct') {
                const res = await fetch('http://localhost:5000/api/direct-messages/conversations', { headers });
                if (res.ok) setConversations((await res.json()).conversations || []);
            } else {
                const res = await fetch('http://localhost:5000/api/events', { headers });
                if (res.ok) {
                    const data = await res.json();
                    let loadedEvents = data.events || [];

                    const updatedEvents = await Promise.all(loadedEvents.map(async (evt) => {
                        try {
                            const msgRes = await fetch(`http://localhost:5000/api/messages/event/${evt.id}`, { headers });
                            if (msgRes.ok) {
                                const msgData = await msgRes.json();
                                const msgs = msgData.messages || [];
                                if (msgs.length > 0) {
                                    evt.last_message = msgs[msgs.length - 1].content;
                                    evt.last_message_time = msgs[msgs.length - 1].created_at; 
                                }
                            }
                        } catch(e) {}
                        return evt;
                    }));
                    setEvents([...updatedEvents]);
                }
            }
        } catch (error) {
            console.error("Lỗi tải sidebar chat:", error);
        }
    }, [activeTab]);

    const fetchSidebarDataRef = useRef(fetchSidebarData);
    useEffect(() => { fetchSidebarDataRef.current = fetchSidebarData; }, [fetchSidebarData]);

    useEffect(() => {
        fetchSidebarData();
        setShowNewChat(false);
    }, [fetchSidebarData]);

    const loadMessages = useCallback(async (chatTarget, tab) => {
        if (!chatTarget) return;
        const token = localStorage.getItem('my_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            if (tab === 'direct') {
                const res = await fetch(`http://localhost:5000/api/direct-messages/user/${chatTarget.user_id}`, { headers });
                if (res.ok) setMessages((await res.json()).messages || []);
            } else {
                const res = await fetch(`http://localhost:5000/api/messages/event/${chatTarget.id}`, { headers });
                if (res.ok) setMessages((await res.json()).messages || []);
            }
        } catch (error) {
            console.error("Lỗi tải tin nhắn:", error);
        }
    }, []);

    const loadMessagesRef = useRef(loadMessages);
    useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);

    // Gọi API lấy danh sách bạn bè có trạng thái 'accepted' dựa theo Controller Backend
    const fetchAllUsers = async () => {
        if (showNewChat) { setShowNewChat(false); return; }
        setShowNewChat(true);
        const token = localStorage.getItem('my_token');
        try {
            const res = await fetch('http://localhost:5000/api/direct-messages/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data.users || []); // Trả về danh sách bạn bè hợp lệ để chat
            }
        } catch (error) { console.error("Lỗi lấy danh sách bạn chat:", error); }
    };

    // --- KHỞI TẠO SOCKET ---
    useEffect(() => {
        const token = localStorage.getItem('my_token');
        if (!token) return;

        socketRef.current = io('http://localhost:5000', { auth: { token } });

        socketRef.current.on('connect', () => console.log("🟢 ĐÃ KẾT NỐI SOCKET"));
        socketRef.current.on('connect_error', (err) => console.error("🔴 LỖI SOCKET:", err.message));

        socketRef.current.on('new_direct_message', (msg) => {
            const currentTab = activeTabRef.current;
            const currentChat = selectedChatRef.current;
            const activeUser = getCurrentUser();

            const isCurrentlyViewing = currentChat && currentTab === 'direct' &&
                (Number(msg.sender_id) === Number(currentChat.user_id) || Number(msg.receiver_id) === Number(currentChat.user_id));

            if (isCurrentlyViewing) {
                loadMessagesRef.current(currentChat, currentTab);
            } else {
                if (activeUser && Number(msg.sender_id) !== Number(activeUser.id)) {
                    setUnreadDMs(prev => ({ ...prev, [msg.sender_id]: true }));
                }
            }
            if (fetchSidebarDataRef.current) fetchSidebarDataRef.current(); 
        });

        socketRef.current.on('new_message', (msg) => {
            const currentTab = activeTabRef.current;
            const currentChat = selectedChatRef.current;
            const activeUser = getCurrentUser();

            const isCurrentlyViewing = currentChat && currentTab === 'event' && Number(msg.event_id) === Number(currentChat.id);

            if (isCurrentlyViewing) {
                loadMessagesRef.current(currentChat, currentTab);
            } else {
                if (activeUser && Number(msg.sender_id) !== Number(activeUser.id)) {
                    setUnreadEvents(prev => ({ ...prev, [msg.event_id]: true }));
                }
            }
            if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
        });

        socketRef.current.on('direct_message_recalled', (data) => {
            setMessages(prev => prev.map(m => Number(m.id) === Number(data.id) ? { ...m, is_revoked: true } : m));
            if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
        });

        socketRef.current.on('delete_message', (data) => {
            setMessages(prev => prev.map(m => Number(m.id) === Number(data.id) ? { ...m, is_revoked: true } : m));
            if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []); 

    useEffect(() => {
        if (socketRef.current && events.length > 0) {
            events.forEach(evt => {
                socketRef.current.emit('join_event', evt.id);
            });
        }
    }, [events]);

    const handleSelectChat = async (item, isNewChat = false) => {
        const chatTarget = isNewChat ? { ...item, user_id: item.id } : item;
        setSelectedChat(chatTarget);
        if (isNewChat) setShowNewChat(false);
       
        if (activeTab === 'direct') setUnreadDMs(prev => ({ ...prev, [chatTarget.user_id]: false }));
        else setUnreadEvents(prev => ({ ...prev, [chatTarget.id]: false }));

        if (activeTab === 'direct') {
            setConversations(prev => prev.map(conv => 
                conv.user_id === chatTarget.user_id ? { ...conv, unread_count: 0 } : conv
            ));
        }

        setLoading(true);
        if (activeTab === 'event' && socketRef.current) {
            socketRef.current.emit('join_event', chatTarget.id);
        }
        await loadMessages(chatTarget, activeTab);
        setLoading(false);

        if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedChat) return;

        const sentText = inputText;
        setInputText(''); 

        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: currentUser?.id,
            sender_name: currentUser?.full_name,
            content: sentText,
            created_at: new Date()
        };
        setMessages(prev => [...prev, tempMsg]);

        const token = localStorage.getItem('my_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        try {
            let res;
            if (activeTab === 'direct') {
                res = await fetch('http://localhost:5000/api/direct-messages', {
                    method: 'POST', headers, body: JSON.stringify({ receiver_id: selectedChat.user_id, content: sentText })
                });
            } else {
                res = await fetch('http://localhost:5000/api/messages', {
                    method: 'POST', headers, body: JSON.stringify({ event_id: selectedChat.id, content: sentText })
                });
            }

            if (res.ok) {
                await loadMessages(selectedChat, activeTab);
                if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
            } else {
                const errData = await res.json();
                Swal.fire('Lỗi', errData.message || 'Không thể gửi tin nhắn', 'error');
                setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Lỗi kết nối máy chủ', 'error');
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (typeof msgId === 'string' && msgId.startsWith('temp-')) return;

        const result = await Swal.fire({
            title: 'Thu hồi tin nhắn?',
            text: "Tin nhắn này sẽ bị thu hồi với mọi người.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Thu hồi',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };
           
            try {
                let res;
                if (activeTab === 'direct') {
                    res = await fetch(`http://localhost:5000/api/direct-messages/${msgId}/recall`, { method: 'PATCH', headers });
                } else {
                    res = await fetch(`http://localhost:5000/api/messages/${msgId}`, { method: 'DELETE', headers });
                }

                if (res.ok) {
                    setMessages(prev => prev.map(m => Number(m.id) === Number(msgId) ? { ...m, is_revoked: true } : m));
                    if (fetchSidebarDataRef.current) fetchSidebarDataRef.current();
                } else {
                    const err = await res.json();
                    Swal.fire('Lỗi', err.message, 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
            }
        }
    };

    const filteredAllUsers = allUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
        <div className="chat-page-container">
            {/* CỘT TRÁI (SIDEBAR) */}
            <div className="chat-sidebar">
                <div className="chat-tabs">
                    <button className={`chat-tab-btn ${activeTab === 'direct' ? 'active' : ''}`} onClick={() => { setActiveTab('direct'); setSelectedChat(null); setMessages([]); }}>
                        Nhắn riêng
                    </button>
                    <button className={`chat-tab-btn ${activeTab === 'event' ? 'active' : ''}`} onClick={() => { setActiveTab('event'); setSelectedChat(null); setMessages([]); }}>
                        Sự kiện
                    </button>
                </div>

                {activeTab === 'direct' && (
                    <div className="chat-new-btn-container">
                        <button className={`chat-new-btn ${showNewChat ? 'active' : ''}`} onClick={fetchAllUsers}>
                            {showNewChat ? 'Đóng tìm kiếm' : 'Tin nhắn mới'}
                        </button>
                    </div>
                )}

                <div className="chat-list">
                    {activeTab === 'direct' && showNewChat ? (
                        <>
                            <input className="chat-search-input" type="text" placeholder="Tìm bạn bè để chat..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
                            {filteredAllUsers.length > 0 ? filteredAllUsers.map(user => (
                                <div key={user.id} className="chat-list-item search-result" onClick={() => handleSelectChat(user, true)}>
                                    <div className="chat-item-avatar">
                                        {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                                    </div>
                                    <div className="chat-item-content">
                                        <strong className="chat-item-name">{user.full_name}</strong>
                                        <div className="chat-item-last-msg" style={{fontSize: '12px'}}>{user.email}</div>
                                    </div>
                                </div>
                            )) : <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px' }}>Không tìm thấy bạn bè trong danh bạ.</p>}
                        </>
                    ) : (
                        activeTab === 'direct' ? (
                            conversations.length > 0 ? conversations.map(item => {
                                const isUnread = item.unread_count > 0 || unreadDMs[item.user_id];
                                const avatarInitials = item.full_name ? item.full_name.substring(0, 2).toUpperCase() : 'U';

                                return (
                                    <div key={item.user_id} className={`chat-list-item ${selectedChat?.user_id === item.user_id ? 'selected' : ''} ${isUnread ? 'unread-bg' : ''}`} onClick={() => handleSelectChat(item)}>
                                        <div className="chat-item-avatar">
                                            {avatarInitials}
                                        </div>

                                        <div className="chat-item-content">
                                            <div className="chat-item-header">
                                                <strong className={`chat-item-name ${isUnread ? 'unread-text' : ''}`}>{item.full_name}</strong>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.last_message_time && (
                                                        <span className={`chat-sidebar-time ${isUnread ? 'unread-time' : ''}`}>
                                                            {formatSidebarTime(item.last_message_time)}
                                                        </span>
                                                    )}
                                                    {isUnread && <span className="chat-unread-dot"></span>}
                                                </div>
                                            </div>
                                            <div className={`chat-item-last-msg ${isUnread ? 'unread-text' : ''}`}>
                                                {item.last_message || 'Chưa có tin nhắn'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '14px' }}><p>Chưa có lịch sử trò chuyện.</p></div>
                        ) : (
                            events.length > 0 ? events.map(item => {
                                const isUnreadEvent = unreadEvents[item.id];
                                return (
                                    <div key={item.id} className={`chat-list-item ${selectedChat?.id === item.id ? 'selected' : ''} ${isUnreadEvent ? 'unread-bg' : ''}`} onClick={() => handleSelectChat(item)}>
                                        <div className="chat-item-header">
                                            <strong className={`chat-item-name ${isUnreadEvent ? 'unread-text' : ''}`}>{item.title}</strong>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {item.last_message_time && (
                                                    <span className={`chat-sidebar-time ${isUnreadEvent ? 'unread-time' : ''}`}>
                                                        {formatSidebarTime(item.last_message_time)}
                                                    </span>
                                                )}
                                                {isUnreadEvent && <span className="chat-unread-dot"></span>}
                                            </div>
                                        </div>
                                        <div className={`chat-item-last-msg ${isUnreadEvent ? 'unread-text' : ''}`}>
                                            {item.last_message || 'Bấm vào để xem thảo luận nhóm...'}
                                        </div>
                                    </div>
                                );
                            }) : <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '20px' }}>Không có sự kiện nào.</p>
                        )
                    )}
                </div>
            </div>

            {/* CỘT PHẢI (MAIN CHAT) */}
            <div className="chat-main">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-avatar">
                                {activeTab === 'direct' ? (
                                    selectedChat.full_name?.substring(0, 2).toUpperCase()
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                )}
                            </div>
                            <div className="chat-header-info">
                                <h4>{activeTab === 'direct' ? selectedChat.full_name : `${selectedChat.title}`}</h4>
                                <span className="chat-header-status">● Bạn bè</span>
                            </div>
                        </div>

                        <div className="chat-messages-area">
                            {loading ? <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải tin nhắn...</p> : (
                                messages.length > 0 ? messages.map((msg, index) => {
                                    const isMe = Number(msg.sender_id) === Number(currentUser?.id);
                                    const isRevoked = msg.is_revoked || msg.is_deleted || msg.is_deleted_by_sender || msg.is_deleted_by_receiver;
                                   
                                    if (isRevoked) {
                                        return (
                                            <div key={msg.id || index} className={`chat-message-wrapper ${isMe ? 'me' : 'other'}`}>
                                                <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <div className="chat-message-bubble revoked">
                                                            Tin nhắn đã được thu hồi
                                                        </div>
                                                        <span className="chat-message-time">
                                                            {formatTime(msg.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id || index} className={`chat-message-wrapper ${isMe ? 'me' : 'other'}`}>
                                            {!isMe && activeTab === 'event' && (
                                                <div className="chat-message-sender">{msg.sender_name}</div>
                                            )}
                                           
                                            <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                    <div className={`chat-message-bubble ${isMe ? 'me' : 'other'}`}>
                                                        {msg.content}
                                                    </div>
                                                    <span className="chat-message-time">
                                                        {formatTime(msg.created_at)}
                                                    </span>
                                                </div>

                                                {(isMe || currentUser?.role === 'admin') && msg.id && !String(msg.id).startsWith('temp-') && (
                                                    <button
                                                        className="chat-msg-delete-btn"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        title="Thu hồi tin nhắn"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18"></path>
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : <div style={{ textAlign: 'center', color: '#64748b', marginTop: '60px' }}><span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>👋</span><p style={{ fontWeight: '600', color: '#1e293b', margin: '0 0 5px 0' }}>Bắt đầu cuộc trò chuyện</p><p style={{ margin: 0, fontSize: '13px' }}>Hãy gửi lời chào đầu tiên nhé!</p></div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input className="chat-input-field" type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Soạn tin nhắn..." />
                            <button className={`chat-send-btn ${inputText.trim() ? 'active' : 'disabled'}`} type="submit" disabled={!inputText.trim()}>
                                Gửi
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-empty-state">
                        <span style={{ fontSize: '60px', opacity: 0.5 }}>💬</span>
                        <h3>Tin nhắn TaskFlow</h3>
                        <p>Chọn một người bạn từ thanh bên trái để bắt đầu thảo luận.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;