import * as React from 'react'
import {AuthDetails, UserDetails} from "../../../types/src";

// TODO - maybe add expiration to userDetails cache? not an issue right now as identity expires after 1 hour
type Context = {
    auth: AuthDetails,
    users: UserDetails,
    updateUsers?: (updatedUsers: UserDetails) => void
}
export const SessionContext = React.createContext<Context>({
    auth: {
        isAuthenticated: false
    },
    users: {}
})