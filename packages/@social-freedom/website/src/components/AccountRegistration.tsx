import * as React from 'react'
import {Component} from 'react'
import {Container, Form, Grid, List, Message, Segment} from "semantic-ui-react";
import Auth from "../services/auth";
import {AuthContext} from "./AuthContext";

const RegionOptions = [
    {key: "us-east-2", text: "US East (Ohio) ", value: "us-east-2"},
    {key: "us-east-1", text: "US East (N. Virginia) ", value: "us-east-1"},
    {key: "us-west-1", text: "US West (N. California) ", value: "us-west-1"},
    {key: "us-west-2", text: "US West (Oregon) ", value: "us-west-2"},
    {key: "ap-east-1", text: "Asia Pacific (Hong Kong) ", value: "ap-east-1"},
    {key: "ap-south-1", text: "Asia Pacific (Mumbai) ", value: "ap-south-1"},
    {key: "ap-northeast-3", text: "Asia Pacific (Osaka-Local) ", value: "ap-northeast-3"},
    {key: "ap-northeast-2", text: "Asia Pacific (Seoul) ", value: "ap-northeast-2"},
    {key: "ap-southeast-1", text: "Asia Pacific (Singapore) ", value: "ap-southeast-1"},
    {key: "ap-southeast-2", text: "Asia Pacific (Sydney) ", value: "ap-southeast-2"},
    {key: "ap-northeast-1", text: "Asia Pacific (Tokyo) ", value: "ap-northeast-1"},
    {key: "ca-central-1", text: "Canada (Central) ", value: "ca-central-1"},
    {key: "cn-north-1", text: "China (Beijing) ", value: "cn-north-1"},
    {key: "cn-northwest-1", text: "China (Ningxia) ", value: "cn-northwest-1"},
    {key: "eu-central-1", text: "EU (Frankfurt) ", value: "eu-central-1"},
    {key: "eu-west-1", text: "EU (Ireland) ", value: "eu-west-1"},
    {key: "eu-west-2", text: "EU (London) ", value: "eu-west-2"},
    {key: "eu-west-3", text: "EU (Paris) ", value: "eu-west-3"},
    {key: "eu-north-1", text: "EU (Stockholm) ", value: "eu-north-1"},
    {key: "me-south-1", text: "Middle East (Bahrain) ", value: "me-south-1"},
    {key: "sa-east-1", text: "South America (Sao Paulo) ", value: "sa-east-1"},
    {key: "us-gov-east-1", text: "AWS GovCloud (US-East) ", value: "us-gov-east-1"},
    {key: "us-gov-west-1", text: "AWS GovCloud (US-West) ", value: "us-gov-west-1"}
]

type Properties = {
    submitSuccess: () => Promise<void>
}
type State = {
    accountId?: string,
    accountIdError?: boolean,
    region?: string,
    regionError?: boolean,
    apiOrigin?: string,
    apiOriginError?: boolean,
    submitSuccess?: boolean,
    submitError?: boolean
}
export default class AccountRegistration extends Component<Properties, State> {
    static contextType = AuthContext
    context!: React.ContextType<typeof AuthContext>

    constructor(props: Properties, state: State) {
        super(props, state)
        this.state = this.context && this.context.accountIdentifiers ? {
            accountId: this.context.accountIdentifiers.accountId || '',
            region: this.context.accountIdentifiers.region || '',
            apiOrigin: this.context.accountIdentifiers.apiOrigin || ''
        } : {}
    }

    handleChange = (e: any, data: { [key: string]: any }) => {
        this.setState({[data.name]: data.value})
    }

    submitForm = () => {
        const stateUpdate: State = {
            submitSuccess: false,
            submitError: false
        }
        stateUpdate.accountIdError = !this.state.accountId
        stateUpdate.regionError = !this.state.region
        stateUpdate.apiOriginError = !this.state.apiOrigin
        this.setState(stateUpdate)

        if (!stateUpdate.accountIdError && !stateUpdate.regionError && !stateUpdate.apiOriginError) {
            fetch(`${process.env.REACT_APP_FEDERAL_API_ORIGIN}/prod/register`, {
                method: 'POST',
                body: JSON.stringify({
                    accountId: this.state.accountId,
                    region: this.state.region,
                    apiOrigin: this.state.apiOrigin
                }),
                headers: {
                    'Authorization': Auth.getAuthToken()
                }
            }).then(() => {
                this.setState({
                    submitSuccess: true
                })
                this.props.submitSuccess()
            }).catch(() => {
                this.setState({
                    submitError: true
                })
            })
        }
    }

    render() {
        // @ts-ignore
        const identityId = this.context.identity.id
        return <Container>
            <Message>
                <Message.Header>Register your account stack</Message.Header>
                <p>
                    Before you can participate, you'll first need to deploy your user stack and register it here.
                </p>
                <List ordered>
                    <List.Item>
                        If you haven't already, create an AWS account
                    </List.Item>
                    <List.Item>
                        Install the AWS CLI and run:
                        <Segment raised>
                            aws configure
                        </Segment>
                    </List.Item>
                    <List.Item>
                        Add the following environment variables to your development machine:
                        <Segment raised>
                            <Grid columns={2}>
                                <Grid.Row>
                                    <Grid.Column>
                                        FEDERAL_STACK_USER_POOL_ARN
                                    </Grid.Column>
                                    <Grid.Column>
                                        {process.env.REACT_APP_USER_POOL_ARN}
                                    </Grid.Column>
                                </Grid.Row>
                                <Grid.Row>
                                    <Grid.Column>
                                        FEDERAL_STACK_WEBSITE_ORIGIN
                                    </Grid.Column>
                                    <Grid.Column>
                                        {process.env.REACT_APP_WEBSITE_ORIGIN}
                                    </Grid.Column>
                                </Grid.Row>
                                <Grid.Row>
                                    <Grid.Column>
                                        USER_STACK_USER_ID
                                    </Grid.Column>
                                    <Grid.Column>
                                        {identityId}
                                    </Grid.Column>
                                </Grid.Row>
                            </Grid>
                        </Segment>
                    </List.Item>
                    <List.Item>
                        Clone the social-freedom Github repo:
                        <Segment raised>
                            git clone git@github.com:wheaney/social-freedom.git
                        </Segment>
                    </List.Item>
                    <List.Item>
                        Deploy the user stack (bash only for now):
                        <Segment raised>
                            npm run userstackdeploy
                        </Segment>
                    </List.Item>
                    <List.Item>
                        Note the <b>UserStack.APIEndpoint</b> output variable at the end of the deployment, then fill
                        out the form below.
                    </List.Item>
                </List>
            </Message>
            <Form success={this.state.submitSuccess} error={this.state.submitError}>
                <Form.Input label="User ID" value={identityId} readOnly/>
                <Form.Input label="AWS Account ID" name='accountId' value={this.state.accountId} required
                            onChange={this.handleChange}
                            error={this.state.accountIdError}/>
                <Form.Select label="AWS Account Region" name='region' value={this.state.region} options={RegionOptions}
                             required onChange={this.handleChange}
                             error={this.state.regionError}/>
                <Form.Input label="Account API Origin" name='apiOrigin' value={this.state.apiOrigin}
                            placeholder="Output from user stack CDK deployment" required
                            onChange={this.handleChange} error={this.state.apiOriginError}/>
                <Form.Button onClick={this.submitForm}>Register</Form.Button>
            </Form>
        </Container>
    }
}