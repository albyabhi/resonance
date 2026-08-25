/**
 * Error message mapping utility
 * Maps technical error messages to user-friendly messages
 */

export const ERROR_MESSAGES = {
  // MongoDB/Mongoose errors
  "Cast to ObjectId failed": "Invalid ID format. Please check the ID and try again.",
  "Cast to ObjectId failed for value": "Invalid ID format. Please check the ID and try again.",
  "duplicate key error": "A record with this value already exists.",
  "E11000 duplicate key error": "This record already exists.",
  "duplicate key error collection": "This record already exists.",
  "ValidationError": "Please check your input and try again.",
  "validator failed": "Invalid input. Please check the fields and try again.",
  "DocumentNotFoundError": "Record not found.",
  "Document not found": "Record not found.",
  "VersionError": "This record was modified by another user. Please refresh and try again.",
  "ParallelSaveError": "This record was modified by another user. Please refresh and try again.",

  // Network/Connection errors
  "NetworkError": "Unable to connect to the server. Please check your connection.",
  "Failed to fetch": "Unable to connect to the server. Please check your connection.",
  "ECONNREFUSED": "Server is not available. Please try again later.",
  "ETIMEDOUT": "Request timed out. Please try again.",
  "timeout": "Request timed out. Please try again.",

  // Authentication/Authorization errors
  "Unauthorized": "Your session has expired. Please log in again.",
  "Forbidden": "You don't have permission to perform this action.",
  "Invalid token": "Your session has expired. Please log in again.",
  "Token expired": "Your session has expired. Please log in again.",
  "jwt malformed": "Invalid session. Please log in again.",
  "jwt expired": "Your session has expired. Please log in again.",
  "Invalid credentials": "Invalid email or password.",
  "User not found": "Account not found. Please check your email.",
  "Account locked": "Account is locked. Please contact support.",
  "Too many requests": "Too many attempts. Please try again later.",

  // Server errors
  "Internal Server Error": "Something went wrong on our end. Please try again later.",
  "Internal server error": "Something went wrong on our end. Please try again later.",
  "Service Unavailable": "Service is temporarily unavailable. Please try again later.",
  "Bad Gateway": "Server error. Please try again later.",
  "Gateway Timeout": "Server is taking too long to respond. Please try again later.",

  // File upload errors
  "File too large": "File size exceeds the maximum allowed limit.",
  "Invalid file type": "File type is not supported.",
  "Upload failed": "Failed to upload file. Please try again.",

  // Business logic errors
  "Event registration is not open": "Registration for this event is not open yet.",
  "Event registration is closed": "Registration for this event has closed.",
  "Maximum entries reached": "Maximum number of entries reached for this event.",
  "Team too large": "Team size exceeds the maximum allowed.",
  "Team too small": "Team size is below the minimum required.",
  "Participant not found": "Participant not found in this organization.",
  "Gender restriction": "This event has gender restrictions.",
  "Age restriction": "Participant does not meet the age requirements.",
  "Duplicate registration": "This participant is already registered for this event.",
  "Team name already taken": "A team with this name already exists for this event.",
  "Chest number already assigned": "This chest number is already assigned.",
  "Competition not found": "Competition not found.",
  "Group not found": "Group not found.",
  "Participant already in team": "Participant is already in a team for this event.",
  "Maximum teams per group reached": "Maximum teams per group reached for this event.",
  "Cannot change status of cancelled event": "Cannot change status of a cancelled event.",
  "Cannot transition from": "Invalid status transition.",
  "Only delayed events can be resumed": "Only delayed events can be resumed.",
  "No previous status to resume to": "No previous status to resume to.",
};

/**
 * Get user-friendly error message from technical error
 * @param {Error|string} error - Error object or message string
 * @returns {string} User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return "An unknown error occurred.";

  const message = error.message || String(error);

  // Check for exact matches first
  if (ERROR_MESSAGES[message]) {
    return ERROR_MESSAGES[message];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Check error code if it's a MongoDB error
  if (error.code) {
    const codeMessages = {
      11000: "This record already exists.",
      11001: "This record already exists.",
      121: "Document validation failed.",
      139: "Operation timed out.",
    };
    if (codeMessages[error.code]) return codeMessages[error.code];
  }

  // Check HTTP status if available
  if (error.status) {
    const statusMessages = {
      400: "Invalid request. Please check your input.",
      401: "Your session has expired. Please log in again.",
      403: "You don't have permission to perform this action.",
      404: "Resource not found.",
      409: "This record already exists.",
      413: "File size exceeds the maximum allowed limit.",
      415: "Unsupported file type.",
      422: "Invalid input. Please check the fields.",
      429: "Too many requests. Please try again later.",
      500: "Server error. Please try again later.",
      502: "Server error. Please try again later.",
      503: "Service unavailable. Please try again later.",
      504: "Server timeout. Please try again later.",
    };
    if (statusMessages[error.status]) return statusMessages[error.status];
  }

  // Return original message if no mapping found, but truncate if too long
  return message.length > 200 ? message.substring(0, 200) + "..." : message;
}

/**
 * Create a standardized error response object
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context where error occurred (for logging)
 * @returns {Object} Standardized error object
 */
export function createErrorResponse(error, context = "") {
  const message = getFriendlyErrorMessage(error);
  const technical = error.message || String(error);
  
  console.error(`[Error${context ? ` in ${context}` : ""}]`, {
    userMessage: message,
    technical,
    stack: error.stack,
  });

  return {
    success: false,
    message,
    technical: technical,
  };
}