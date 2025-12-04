import PropTypes from 'prop-types';

export const Input = ({ 
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  className = '',
  error,
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 bg-gray-950 border ${
            error ? 'border-red-500' : 'border-gray-900'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

Input.propTypes = {
  type: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  icon: PropTypes.elementType,
  className: PropTypes.string,
  error: PropTypes.string,
};
