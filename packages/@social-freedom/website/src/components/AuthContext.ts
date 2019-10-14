import * as React from 'react'
import {AuthDetails} from "@social-freedom/types";

export const AuthContext = React.createContext({
    isAuthenticated: false
} as AuthDetails)