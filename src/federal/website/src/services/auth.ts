import {GetIdentityResponse} from "../../../../shared/auth-types";

const Auth = {
    getAuthToken: ():string => {
        const params = new URLSearchParams(window.location.hash)
        return params.get('#id_token') || ''
    },

    getAuthUrl: (action: 'login' | 'signup' | 'logout'): string => {
        return `https://social-freedom-test.auth.us-east-1.amazoncognito.com/${action}?response_type=token&client_id=7852rg5vad06i8f69sdcrspu53&redirect_uri=https://d325d3uej8gzt4.cloudfront.net`
    },

    isAuthenticated: ():boolean => {
        return !!Auth.getAuthToken()
    },

    getIdentity: async ():Promise<GetIdentityResponse> => {
        if (Auth.isAuthenticated()) {
            const apiResponse = await fetch(`${process.env.REACT_APP_FEDERAL_API_ORIGIN}/prod/identity`, {
                headers: {
                    'Authorization': Auth.getAuthToken()
                }
            })
            if (apiResponse.status === 200) {
                return await apiResponse.json()
            }
        }

        return {
            isAuthenticated: false
        }
    }
}

export default Auth