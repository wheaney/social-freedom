import {ReducedAccountDetails} from "@social-freedom/types";
import Auth from "./Auth";
import {FollowRequestsResponse} from "../../../types/src";

const Follows = {
    createFollowRequest: (internalApiOrigin: string, account: ReducedAccountDetails) => {
        return fetch(`${internalApiOrigin}/internal/follow-requests`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            },
            method: 'POST',
            body: JSON.stringify(account)
        })
    },

    getFollowRequests: async (internalApiOrigin: string, cachedUsers: string[]): Promise<FollowRequestsResponse> => {
        let requestParams = ''
        if (cachedUsers.length > 0) {
            requestParams = `?cachedUsers=${cachedUsers.join(',')}`
        }
        const response = await fetch(`${internalApiOrigin}/internal/follow-requests${requestParams}`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
        return await response.json()
    },

    respondToRequest: async (internalApiOrigin: string, userId: string, accepted: boolean): Promise<void> => {
        await fetch(`${internalApiOrigin}/internal/follow-request-response`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            },
            method: 'POST',
            body: JSON.stringify({
                userId: userId,
                accepted: accepted
            })
        })
    }
}

export default Follows;