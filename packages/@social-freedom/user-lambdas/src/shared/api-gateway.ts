import {APIGatewayEvent} from "aws-lambda";
import Helpers from "../shared/helpers";
import {AuthTokenHeaderName} from "../shared/constants";
import ThisAccount from "../daos/this-account";

export type APIGatewayEventFunction = (event: APIGatewayEvent, eventBody: any) => any;
export type APIGatewayEventFunctions = { [key: string]: APIGatewayEventFunction };
export type DefaultAPIGatewayEventFunctions = {
    eventBody: APIGatewayEventFunction,
    userId: APIGatewayEventFunction,
    authToken: APIGatewayEventFunction
}

export type DefaultEventValues = { [key in keyof DefaultAPIGatewayEventFunctions]: any }

const APIGateway = {
    handleEvent: async (handler: () => Promise<any>) => {
        try {
            return APIGateway.lambdaResponse(200, await handler())
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
            userId: EventFunctions.getUserId,
            authToken: EventFunctions.getAuthToken,
            ...eventFunctions
        }

        Object.keys(allEventFunctions).map((key: keyof AllEventFunctions) => {
            resolvedValues[key] = allEventFunctions[key](event, eventBody)
        })

        return await Helpers.resolveInObject(resolvedValues)
    },

    internalAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        if (process.env.USER_ID !== EventFunctions.getUserId(event)) {
            throw new Error(`Unauthorized userId: ${EventFunctions.getUserId(event)}`)
        }

        return APIGateway.resolveEventValues(event, eventFunctions)
    },

    followerAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        const resolvedEventValues: U = await APIGateway.resolveEventValues(event, {
            ...eventFunctions,
            isFollowedBy: EventFunctions.isFollowedByRequestingUser
        })
        if (!resolvedEventValues.isFollowedBy) {
            throw new Error(`Unauthorized userId: ${resolvedEventValues.userId}`)
        }

        return resolvedEventValues
    },

    lambdaResponse: (httpStatus: number, responseBody?: any) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN
            }
        }
    }
}

export const EventFunctions = {
    getUserId: (event: APIGatewayEvent) => {
        return event?.requestContext?.authorizer?.claims?.sub
    },

    getAuthToken: (event: APIGatewayEvent) => {
        return event?.headers?.[AuthTokenHeaderName]
    },

    // should only be used within follower-api lambdas
    isFollowingRequestingUser: (event: APIGatewayEvent): Promise<boolean> => {
        return ThisAccount.isFollowing(EventFunctions.getUserId(event))
    },

    // should only be used within follower-api lambdas
    isFollowedByRequestingUser: (event: APIGatewayEvent): Promise<boolean> => {
        return ThisAccount.isFollowedBy(EventFunctions.getUserId(event))
    },

    cachedUsers: (event: APIGatewayEvent) => {
        return event?.queryStringParameters?.['cachedUsers']?.split(",") ?? []
    }
}

export default APIGateway