/**
 * Analyze data structure and determine visualization type
 */
export const analyzeDataStructure = (results) => {
  if (!results || !results.results || results.results.length === 0) {
    return null;
  }

  const data = results.results;
  const keys = Object.keys(data[0]);
  const values = Object.values(data[0]);

  const hasNumericData = values.some(
    (v) => typeof v === 'number' || !isNaN(parseFloat(v))
  );
  const isSingleValue = data.length === 1 && keys.length === 1;
  const isMultipleRows = data.length > 1;

  return {
    data,
    keys,
    values,
    hasNumericData,
    isSingleValue,
    isMultipleRows,
    rowCount: data.length,
    columnCount: keys.length,
  };
};

/**
 * Format number with locale string
 */
export const formatNumber = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
};

/**
 * Get numeric keys from data
 */
export const getNumericKeys = (data) => {
  if (!data || data.length === 0) return [];

  const keys = Object.keys(data[0]);
  return keys.filter((key) =>
    data.every((row) => typeof row[key] === 'number' || !isNaN(parseFloat(row[key])))
  );
};
