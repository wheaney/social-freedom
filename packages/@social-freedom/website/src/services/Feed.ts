import Auth from "./Auth";
import {GetFeedResponse} from "@social-freedom/types";

const Feed = {
    getFeed: async (apiOrigin: string, cachedUsers: string[]):Promise<GetFeedResponse> => {
        let requestParams = ''
        if (cachedUsers.length > 0) {
            requestParams = `?cachedUsers=${cachedUsers.join(',')}`
        }
        const response = await fetch(`${apiOrigin}/internal/feed${requestParams}`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
        return await response.json()
    }
}

export default Feed