import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthorProfilePath } from '../utils/authorProfile';

/**
 * 可点击作者名/头像；无有效 ID 时退化为普通 span
 */
export default function AuthorLink({
  author,
  children,
  className = '',
  stopPropagation = false,
}) {
  const { user } = useAuth();
  const to = getAuthorProfilePath(author, user);

  if (!to) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link
      to={to}
      className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${className}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </Link>
  );
}
