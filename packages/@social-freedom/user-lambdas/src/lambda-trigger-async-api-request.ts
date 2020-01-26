import {isAsyncAPIRequest} from "@social-freedom/types";
import UserAPI from "./services/user-api";

export const handler = async (request: any) => {
    if (isAsyncAPIRequest(request)) {
        await UserAPI.request(request.origin, request.path, request.authToken, request.requestMethod, request.requestBody)
    }
}