import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export const DataVisualization = ({ data }) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter((key) =>
    data.every((row) => typeof row[key] === 'number' || !isNaN(parseFloat(row[key])))
  );

  if (numericKeys.length === 0) return null;

  const maxValue = Math.max(...data.map((row) => parseFloat(row[numericKeys[0]]) || 0));

  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((row, idx) => {
        const value = parseFloat(row[numericKeys[0]]) || 0;
        const percentage = (value / maxValue) * 100;
        const label = row[keys[0]] || `Item ${idx + 1}`;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 truncate max-w-[120px]">{label}</span>
              <span className="text-purple-400 font-semibold">{value}</span>
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                className="h-full bg-gradient-to-r from-purple-600 to-purple-500 rounded-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

DataVisualization.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
};
