import {APIGatewayEvent} from "aws-lambda";
import {getAuthToken, getUserId, isFollowingRequestingUser} from "./api-gateway-event-functions";
import Util from "./util";

export type APIGatewayEventFunction = (event: APIGatewayEvent, eventBody: any) => any;
export type APIGatewayEventFunctions = {[key:string]:APIGatewayEventFunction};
export type DefaultAPIGatewayEventFunctions = {
    eventBody: APIGatewayEventFunction,
    userId: APIGatewayEventFunction,
    authToken: APIGatewayEventFunction
}

export type DefaultEventValues = {[key in keyof DefaultAPIGatewayEventFunctions]: any}

const APIGateway = {
    proxyWrapper: async (proxyFunction: () => Promise<any>) => {
        try {
            return APIGateway.lambdaResponse(200, await proxyFunction())
        } catch (err) {
            // TODO - add handling for unauthorized, return 401
            console.error(err)
            return APIGateway.lambdaResponse(500)
        }
    },

    /**
     * Event functions front-load any async data retrieval/computation that can operate on just the APIGatewayEvent
     * object. All async functions will be awaited in parallel; any logic that *can* be put here should -- even if it
     * may only be conditionally used -- ideally resulting in one front-loaded await here and at most one more await
     * for any conditional update/delete operations. This will keep request processing to an ideal of only two awaits.
     *
     * @param event - the incoming request's APIGatewayEvent
     * @param eventFunctions - functions that do data retrieval or compute on the event, no update/delete operations
     *                         should occur here
     */
    resolveEventValues: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        const resolvedValues: any = {}

        // add defaults that are used frequently and aren't asynchronous
        const eventBody = event.body ? JSON.parse(event.body) : undefined
        type AllEventFunctions = T & DefaultAPIGatewayEventFunctions
        const allEventFunctions: AllEventFunctions = {
            eventBody: () => eventBody,
            userId: getUserId,
            authToken: getAuthToken,
            ...eventFunctions
        }

        Object.keys(allEventFunctions).map((key: keyof AllEventFunctions) => {
            resolvedValues[key] = allEventFunctions[key](event, eventBody)
        })

        return await Util.resolveInObject(resolvedValues)
    },

    internalAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        if (process.env.USER_ID !== getUserId(event)) {
            throw new Error(`Unauthorized userId: ${getUserId(event)}`)
        }

        return APIGateway.resolveEventValues(event, eventFunctions)
    },

    followerAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        const resolvedEventValues: U = await APIGateway.resolveEventValues(event, {
            ...eventFunctions,
            isFollowing: isFollowingRequestingUser
        })
        if (!resolvedEventValues.isFollowing) {
            throw new Error(`Unauthorized userId: ${resolvedEventValues.userId}`)
        }

        return resolvedEventValues
    },

    lambdaResponse: (httpStatus: number = 200, responseBody?: any) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN
            }
        }
    },
}

export default APIGateway