export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  TIMEOUT: 30000,
};

export const FILE_UPLOAD_CONFIG = {
  ACCEPTED_FORMATS: {
    "text/csv": [".csv"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

export const APP_CONFIG = {
  APP_NAME: "DataWise",
  APP_DESCRIPTION: "AI-Powered Data Analytics Platform",
};
