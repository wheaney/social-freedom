import * as React from 'react'
import {Container, Form, FormGroup, Grid, List, Message, Segment} from "semantic-ui-react";
import {FunctionComponent} from "react";

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
    identityId: string
}
const AccountRegistration: React.FunctionComponent<Properties> = (props) => <Container>
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
                                {props.identityId}
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Segment>
            </List.Item>
            <List.Item>
                Deploy the user stack:
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
    <Form>
        <Form.Input label="User ID" value={props.identityId} readOnly/>
        <Form.Input label="AWS Account ID" required/>
        <Form.Select label="AWS Region" options={RegionOptions} required/>
        <Form.Input label="Account API Origin" placeholder="Output from user stack CDK deployment" required/>
    </Form>
</Container>

export default AccountRegistration