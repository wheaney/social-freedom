import {Profile as ProfileType} from "@social-freedom/types"
import Auth from "./Auth";

const Profile = {
    put: async (apiOrigin: string, profile: ProfileType) => {
        return fetch(`${apiOrigin}/internal/profile`, {
            method: 'PUT',
            body: JSON.stringify(profile),
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
    }
}

export default Profile