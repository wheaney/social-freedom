import * as React from "react";
import {Component} from "react";
import {SessionContext} from "../contexts/SessionContext";
import Follows from "../services/Follows";
import {ReducedAccountDetails} from "../../../types/src";
import {Button, Grid} from "semantic-ui-react";

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
        // @ts-ignore
        const followRequestsResponse = await Follows.getFollowRequests(this.context.auth.accountIdentifiers.apiOrigin, this.context.users)

        this.setState({
            requests: followRequestsResponse.userIds
        })

        // @ts-ignore
        this.context.updateUsers(followRequestsResponse.users)
    }

    sortedRequests(): ReducedAccountDetails[] {
        return this.state.requests.map(userId => this.context.users[userId]).filter(details => !!details).sort()
    }

    async respondToRequest(userId: string, accepted: boolean): Promise<void> {
        // @ts-ignore
        await Follows.respondToRequest(this.context.auth.accountIdentifiers.apiOrigin, userId, accepted)
        this.setState({
            requests: this.state.requests.filter(requestUserId => requestUserId !== userId)
        })
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