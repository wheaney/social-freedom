import fetch from "node-fetch";
import {AuthTokenHeaderName} from "../shared/constants";
import Lambda from "./lambda";

const UserAPI = {
    asyncRequest: async (origin: string, path: string, authToken: string,
                         requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                         requestBody?: any) => {
        await Lambda.triggerAsyncAPIRequest({
            origin: origin,
            path: path,
            authToken: authToken,
            requestMethod: requestMethod,
            requestBody: requestBody
        })
    },

    request: async (origin: string, path: string, authToken: string,
                       requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                       requestBody?: any): Promise<any> => {
        if (process.env.ALLOW_SYNCHRONOUS_API_REQUESTS !== "true") {
            // lambdas triggered directly by API Gateway should being queueing these requests
            throw new Error('Synchronous API requests not allowed within this function')
        }

        const startTime = Date.now()
        const requestBodyString: string = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody)
        const additionalRequestHeaders = !!requestBodyString && {
            'Content-Type': 'application/json',
            'Content-Length': requestBodyString.length.toString()
        }
        const requestUrl = `${origin}${path}`
        const res = await fetch(requestUrl, {
            method: requestMethod,
            body: !!requestBodyString ? requestBodyString : undefined,
            headers: {
                [AuthTokenHeaderName]: authToken,
                ...additionalRequestHeaders
            }
        })
        if (!res.ok) {
            throw Error(`API request to URL ${requestUrl} returned with status ${res.status}`)
        }

        console.log(`apiRequest for ${path} took ${Date.now() - startTime}`)

        const responseBody = await res.text()
        if (responseBody?.length) {
            try {
                return JSON.parse(responseBody)
            } catch (err) {
                console.error(`Unexpected response body: ${responseBody}`)
            }
        }
    },
}

export default UserAPI