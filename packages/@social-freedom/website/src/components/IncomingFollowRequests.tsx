import * as React from "react";
import {Component} from "react";
import {SessionContext} from "../contexts/SessionContext";
import Follows from "../services/Follows";
import {ReducedAccountDetails} from "../../../types/src";
import {Button, Grid} from "semantic-ui-react";
import {Optional} from "@social-freedom/types";

type State = {
    requests: string[]
}
export default class IncomingFollowRequests extends Component<any, State> {
    static contextType = SessionContext
    context!: React.ContextType<typeof SessionContext>

    constructor(props: any, state: State) {
        super(props, state)

        this.state = {
            requests: []
        }

        this.respondToRequest = this.respondToRequest.bind(this)
    }

    async componentDidMount(): Promise<void> {
        const internalApiOrigin = this.context.auth.accountIdentifiers?.apiOrigin
        if (internalApiOrigin) {
            const followRequestsResponse = await Follows.getFollowRequests(internalApiOrigin,
                Optional.of(this.context.users).map(Object.keys).get())

            this.setState({
                requests: followRequestsResponse.userIds
            })

            this.context?.updateUsers?.(followRequestsResponse.users)
        }
    }

    sortedRequests(): ReducedAccountDetails[] {
        return this.state.requests.map(userId => this.context.users[userId]).filter(details => !!details).sort()
    }

    async respondToRequest(userId: string, accepted: boolean): Promise<void> {
        const internalApiOrigin = this.context.auth.accountIdentifiers?.apiOrigin
        if (internalApiOrigin) {
            await Follows.respondToRequest(internalApiOrigin, userId, accepted)
            this.setState({
                requests: this.state.requests.filter(requestUserId => requestUserId !== userId)
            })
        }
    }

    render() {
        return <Grid columns={3}>
            {this.sortedRequests().map(user => {
                return <React.Fragment>
                    <Grid.Column>{user.name}</Grid.Column>
                    <Grid.Column><Button primary onClick={() => this.respondToRequest(user.userId, true)}>Accept</Button></Grid.Column>
                    <Grid.Column><Button secondary onClick={() => this.respondToRequest(user.userId, false)}>Ignore</Button></Grid.Column>
                </React.Fragment>
            })}
        </Grid>
    }
}