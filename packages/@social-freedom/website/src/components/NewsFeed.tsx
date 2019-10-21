import * as React from 'react'
import {Component} from 'react'
import {FeedEntry, GetFeedResponse, ReducedAccountDetails} from "@social-freedom/types";
import {Container, Feed, Form, Loader} from "semantic-ui-react";
import {AuthContext} from "./AuthContext";
import Auth from "../services/auth";

type State = {
    loading: boolean,
    entries: FeedEntry[],
    users: {[userId: string]: ReducedAccountDetails},
    postBody: string,
    postBodyError?: boolean,
    postSuccess?: boolean,
    postError?: boolean,
}
export default class NewsFeed extends Component<any, State> {
    static contextType = AuthContext
    context!: React.ContextType<typeof AuthContext>

    constructor(props: any, state: State) {
        super(props, state)
        this.state = {
            loading: true,
            entries: [],
            users: {},
            postBody: ''
        }
    }

    async componentDidMount() {
        await this.refreshPosts()
    }

    async refreshPosts() {
        this.setState({
            loading: true
        })

        // @ts-ignore
        const apiOrigin = this.context.accountIdentifiers.apiOrigin
        const response = await fetch(`${apiOrigin}/prod/internal/feed`, {
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
        const result:GetFeedResponse = await response.json()
        this.setState({
            loading: false,
            entries: result.entries,
            users: {
                ...this.state.users,
                ...result.users
            }
        })
    }

    handleChange = (e: any, data: { [key: string]: any }) => {
        // @ts-ignore
        this.setState({[data.name]: data.value})
    }

    submitPost = () => {
        const stateUpdate: any = {
            postSuccess: false,
            postError: false
        }
        stateUpdate.postBodyError = !this.state.postBody
        this.setState(stateUpdate)

        if (!stateUpdate.postBodyError) {
            // @ts-ignore
            const apiOrigin = this.context.accountIdentifiers.apiOrigin;
            // @ts-ignore
            const userId = this.context.identity.id
            fetch(`${apiOrigin}/prod/internal/posts`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: userId,
                    type: 'Text',
                    body: this.state.postBody
                }),
                headers: {
                    'Authorization': Auth.getAuthToken()
                }
            }).then(() => {
                this.setState({
                    postSuccess: true,
                    postBody: ''
                })
                this.refreshPosts()
            }).catch(() => {
                this.setState({
                    postError: true
                })
            })
        }
    }

    render() {
        return <Container>
            <Form>
                <Form.TextArea label="Create a post" name='postBody' value={this.state.postBody}
                               onChange={this.handleChange}
                               error={this.state.postBodyError}/>
                <Form.Button onClick={this.submitPost}>Post</Form.Button>
            </Form>
            {this.state.loading && <Loader active /> ||
            <Feed>
                {this.state.entries.map(entry => {
                    const user = this.state.users[entry.userId]
                    return <Feed.Event key={entry.id}>
                        <Feed.Label>
                            <img src={user.photoUrl} />
                        </Feed.Label>
                        <Feed.Content>
                            <Feed.Summary>
                                <Feed.User>{user.name}</Feed.User> posted
                                <Feed.Date>{new Date(entry.timestamp).toDateString()}</Feed.Date>
                            </Feed.Summary>
                            {entry.body.body}
                        </Feed.Content>
                    </Feed.Event>
                })}
            </Feed>}
        </Container>
    }
}