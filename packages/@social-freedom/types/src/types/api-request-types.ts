import TypeUtils from "../type-utils";

export type AsyncAPIRequest = {
    origin: string,
    path: string,
    authToken: string,
    requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
    requestBody?: any
}

export function isAsyncAPIRequest(object: any): object is AsyncAPIRequest {
    return TypeUtils.isType('AsyncAPIRequest', object, 'origin', 'path', 'authToken', 'requestMethod')
}