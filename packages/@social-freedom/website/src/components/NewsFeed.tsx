import * as React from 'react'
import {Component} from 'react'
import {FeedEntry, ReducedAccountDetails} from "@social-freedom/types";
import {Container, Feed, Form, Header, Loader} from "semantic-ui-react";
import {AuthContext} from "./AuthContext";
import Posts from "../services/Posts";
import {default as FeedService} from "../services/Feed";
import FollowRequestForm from "./FollowRequestForm";

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

        this.handleChange = this.handleChange.bind(this)
    }

    async componentDidMount() {
        await this.refreshFeed()
    }

    async refreshFeed() {
        this.setState({
            loading: true
        })

        // @ts-ignore
        const apiOrigin = this.context.accountIdentifiers.apiOrigin
        const cachedUsers = Object.keys(this.state.users)
        const result = await FeedService.getFeed(apiOrigin, cachedUsers)
        this.setState({
            loading: false,
            entries: result.entries,
            users: {
                ...this.state.users,
                ...result.users
            }
        })
    }

    handleChange(e: any, data: { [key: string]: any }) {
        // @ts-ignore
        this.setState({[data.name]: data.value})
    }

    async submitPost() {
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
            try {
                await Posts.createPost(apiOrigin, userId, this.state.postBody)
                this.setState({
                    postSuccess: true,
                    postBody: ''
                })
                await this.refreshFeed()
            } catch (err) {
                console.error(err)

                this.setState({
                    postError: true
                })
            }
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
            <FollowRequestForm />
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