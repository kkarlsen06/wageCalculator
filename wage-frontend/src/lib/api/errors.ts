export class ApiError<TPayload = unknown> extends Error {
  status: number;
  path: string;
  payload: TPayload | null;

  constructor(message: string, status: number, path: string, payload: TPayload | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.payload = payload;
  }
}
