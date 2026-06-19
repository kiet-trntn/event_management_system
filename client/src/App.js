import React from 'react';
import { BrowserRouter , Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import ProtectedRouter from './components/ProtectedRouter';
import AdminHeader from './components/admin/header';
import StaffHeader from './components/staff/header';
import ChangePassword from './pages/changepassword';
import MembersList from './pages/admin/member/MembersList';
import AddMember from './pages/admin/member/AddMember';
import EditMember from './pages/admin/member/EditMember';
import ViewMember from './pages/admin/member/ViewMember';
import EventList from './pages/admin/event/EventList';

function App() {
  return (
    <BrowserRouter>
      <Routes> 
        <Route path="/" element= {<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route 
          path="/admin"
          element={ 
            <ProtectedRouter allowRoles="admin">
              <AdminHeader/>
            </ProtectedRouter>
          }
        >
          <Route path="changepassword" element={<ChangePassword />} />
          <Route path="members" element={<MembersList />} />
          <Route path="members/add" element={<AddMember />} />
          <Route path="members/edit/:id" element={<EditMember />} />
          <Route path="members/view/:id" element={<ViewMember />} />
          <Route path="events" element={<EventList />} />
        </Route>

        <Route 
          path="/staff"
          element={ 
            <ProtectedRouter allowRoles="employee">
              <StaffHeader/>
            </ProtectedRouter>
          }
        >  
          <Route path="changepassword" element={<ChangePassword />} />
        </Route>

        <Route path="*" element={<h2>404 - Trang không tồn tại</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
