import {Component, default as React} from "react";
import {Form, Header} from "semantic-ui-react";
import Follows from "../services/Follows";
import {FollowRequest, ReducedAccountDetails} from "@social-freedom/types";
import {SessionContext} from "../contexts/SessionContext";

type State = FollowRequest & {
    apiOriginError?: boolean,
    postsTopicArnError?: boolean,
    profileTopicArnError?: boolean,
    nameError?: boolean,
    userIdError?: boolean
}
export default class FollowRequestForm extends Component<{}, State> {
    static contextType = SessionContext
    context!: React.ContextType<typeof SessionContext>

    constructor(props: any, state: any) {
        super(props, state)

        this.state = {
            apiOrigin: '',
            postsTopicArn: '',
            profileTopicArn: '',
            name: '',
            userId: ''
        }

        this.handleChange = this.handleChange.bind(this)
        this.submitRequest = this.submitRequest.bind(this)
    }

    handleChange(e: any, data: { [key: string]: any }) {
        // @ts-ignore
        this.setState({[data.name]: data.value})
    }

    async submitRequest() {
        const stateUpdate = {
            apiOriginError: !this.state.apiOrigin,
            postsTopicArnError: !this.state.postsTopicArn,
            profileTopicArnError: !this.state.profileTopicArn,
            nameError: !this.state.name,
            userIdError: !this.state.userId
        }

        if (!stateUpdate.apiOriginError && !stateUpdate.postsTopicArnError && !stateUpdate.profileTopicArnError
            && !stateUpdate.nameError && !stateUpdate.userIdError) {
            // @ts-ignore
            await Follows.createFollowRequest(this.context.auth.accountIdentifiers.apiOrigin, this.state as ReducedAccountDetails)
            this.setState({
                apiOrigin: '',
                name: '',
                photoUrl: '',
                postsTopicArn: '',
                profileTopicArn: '',
                userId: '',
                ...stateUpdate
            })
        } else {
            this.setState(stateUpdate)
        }
    }

    render() {
        return <Form>
            <Header size='small'>
                Create a follow request
            </Header>
            <Form.Input fluid label='User ID' name='userId' value={this.state.userId} error={this.state.userIdError} onChange={this.handleChange}/>
            <Form.Input fluid label='Name' name='name' value={this.state.name} error={this.state.nameError} onChange={this.handleChange}/>
            <Form.Input fluid label='Photo URL' name='photoUrl' value={this.state.photoUrl} onChange={this.handleChange}/>
            <Form.Input fluid label='API Origin' name='apiOrigin' value={this.state.apiOrigin} error={this.state.apiOriginError} onChange={this.handleChange}/>
            <Form.Input fluid label='Posts Topic ARN' name='postsTopicArn' value={this.state.postsTopicArn} error={this.state.postsTopicArnError} onChange={this.handleChange}/>
            <Form.Input fluid label='Profile Topic ARN' name='profileTopicArn' value={this.state.profileTopicArn} error={this.state.profileTopicArnError} onChange={this.handleChange}/>
            <Form.Button onClick={this.submitRequest}>Send Request</Form.Button>
        </Form>
    }
}