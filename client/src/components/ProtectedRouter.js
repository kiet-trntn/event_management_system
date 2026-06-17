import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRouter({ children, allowRoles }) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const roles = Array.isArray(allowRoles) ? allowRoles : [allowRoles];

    if(!roles.includes(user.role)) {
       if (user.role === 'admin') {
            return <Navigate to="/admin" replace />;
        } 
        else {
            return <Navigate to="/staff" replace />;
        }
    }   

    return children;
}

export default ProtectedRouter;