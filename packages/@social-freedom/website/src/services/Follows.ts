import {ReducedAccountDetails} from "@social-freedom/types";
import Auth from "./Auth";

const Follows = {
    createFollowRequest: (internalApiOrigin: string, account: ReducedAccountDetails) => {
        return fetch(`${internalApiOrigin}/internal/follow-request`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            },
            method: 'POST',
            body: JSON.stringify(account)
        })
    }
}

export default Follows;