import * as React from 'react'
import {AuthDetails} from "../../../../shared/auth-types";

export const AuthContext = React.createContext({
    isAuthenticated: false
} as AuthDetails)