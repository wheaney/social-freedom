import TypeUtils from "../type-utils";

export type APIRequestMessage = {
    origin: string,
    path: string,
    authToken: string,
    requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
    requestBody?: any
}

export function isAPIRequestMessage(object: any): object is APIRequestMessage {
    return TypeUtils.isType('APIRequestMessage', object, 'origin', 'path', 'authToken', 'requestMethod')
}