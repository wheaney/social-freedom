import * as React from 'react'
import {Component} from 'react'
import {FullPostDetails} from "../../../../user/infrastructure/lambdas/shared/post-types";
import {Container} from "semantic-ui-react";

type State = {
    loading: boolean,
    posts: FullPostDetails[]
}
export default class Feed extends Component<any, State> {
    constructor(props: any, state: State) {
        super(props, state)
        this.state = {
            loading: true,
            posts: []
        }
    }

    async componentDidMount() {
        // TODO - fetch posts
        // await fetch(``)
    }

    render() {
        return <Container>
            Congratulations, your account is setup! This is where you'd see your feed and be able to post.
        </Container>
    }
}