import {AccountIdentifiers} from "./account-types";

export type Identity = {
    id: string, // sub
    authTime: number, // auth_time
    email: string, // email
    username: string, // cognito:usernam
    expiration: Date // exp
}

export type GetIdentityResponse = {
    isAuthenticated: boolean,
    identity?: Identity,
    isRegistered?: boolean,
    accountIdentifiers?: AccountIdentifiers
}