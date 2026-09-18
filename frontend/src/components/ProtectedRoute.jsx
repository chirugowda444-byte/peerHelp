import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRole }) {
 const token = sessionStorage.getItem('token');
const userRole = sessionStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

 if (allowedRole && userRole !== allowedRole) {
  return (
    <Navigate
      to={userRole === 'mentor' ? '/mentor' : '/student'}
      replace
    />
  );
}

  return children;
}

export default ProtectedRoute;