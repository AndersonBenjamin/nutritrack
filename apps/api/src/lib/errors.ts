export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Registro') => new HttpError(404, `${what} não encontrado.`);
export const badRequest = (message: string) => new HttpError(400, message);
