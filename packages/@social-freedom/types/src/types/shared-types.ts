import {UserDetails} from "./account-types";

export type UsersRequest = {
    cachedUsers?: string[]
}

export type UsersResponse = {
    users: UserDetails
}