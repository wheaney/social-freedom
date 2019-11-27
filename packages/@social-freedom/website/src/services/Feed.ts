import Auth from "./Auth";
import {GetFeedResponse} from "@social-freedom/types";

const Feed = {
    getFeed: async (apiOrigin: string, cachedUsers: string[]):Promise<GetFeedResponse> => {
        let feedRequestParams = ''
        if (cachedUsers.length > 0) {
            feedRequestParams = `?cachedUsers=${cachedUsers.join(',')}`
        }
        const response = await fetch(`${apiOrigin}/internal/feed${feedRequestParams}`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
        return await response.json()
    }
}

export default Feed