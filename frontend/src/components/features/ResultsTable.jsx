import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export const ResultsTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="sticky top-0 bg-gray-950">
          <tr>
            {keys.map((key, idx) => (
              <th
                key={idx}
                className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((row, rowIdx) => (
            <motion.tr
              key={rowIdx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIdx * 0.05 }}
              className="hover:bg-gray-950/50 transition-colors"
            >
              {Object.values(row).map((value, colIdx) => (
                <td key={colIdx} className="px-3 py-3 text-sm text-gray-300">
                  {typeof value === 'number' ? (
                    <span className="font-semibold text-purple-400">
                      {value.toLocaleString()}
                    </span>
                  ) : (
                    value
                  )}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ResultsTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
};
