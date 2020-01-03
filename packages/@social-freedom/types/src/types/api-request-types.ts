export type APIRequestMessage = {
    origin: string,
    path: string,
    authToken: string,
    requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
    requestBody?: any
}