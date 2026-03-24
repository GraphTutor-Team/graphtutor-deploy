import { Navigate, useLocation } from 'react-router-dom';
export default function ProtectedRoute({ children }){
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('AUTH_TOKEN') : null;
  const loc = useLocation();
  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname+loc.search)}`} replace />;
  return children;
}