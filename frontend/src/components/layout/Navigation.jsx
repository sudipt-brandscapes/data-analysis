import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, BarChart3 } from 'lucide-react';
import PropTypes from 'prop-types';

export const Navigation = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    // { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    // { path: '/analysis', icon: BarChart3, label: 'Analysis' },
  ];

  return (
    <nav className={`flex flex-col space-y-1 ${className}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                : 'text-gray-400 hover:bg-gray-950/50 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

Navigation.propTypes = {
  className: PropTypes.string,
};
