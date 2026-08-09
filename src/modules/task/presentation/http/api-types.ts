export interface ApiValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    issues?: ApiValidationIssue[];
  };
}
