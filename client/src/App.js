import React from 'react';
import { BrowserRouter , Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import ProtectedRouter from './components/ProtectedRouter';
import AdminHeader from './components/admin/header';
import StaffHeader from './components/staff/header';
import ChangePassword from './pages/changepassword';
import MembersList from './pages/admin/member/MembersList';
import AddMember from './pages/admin/member/AddMember';

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
