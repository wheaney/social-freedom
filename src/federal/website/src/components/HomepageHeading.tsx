import React from 'react'
import {Button, Container, Header, Icon} from "semantic-ui-react";

// TODO - drop inline styling
const HomepageHeading = ({ mobile }: {[key:string]: any}) => (
    <Container text>
        <Header
            as='h1'
            content='Social Freedom'
            inverted
            style={{
                fontSize: mobile ? '2em' : '4em',
                fontWeight: 'normal',
                marginBottom: 0,
                marginTop: mobile ? '1.5em' : '3em',
            }}
        />
        <Header
            as='h2'
            content='The future of social networking is here'
            inverted
            style={{
                fontSize: mobile ? '1.5em' : '1.7em',
                fontWeight: 'normal',
                marginTop: mobile ? '0.5em' : '1.5em',
            }}
        />
        <Button primary size='huge'>
            Get Started
            <Icon name='arrow right' />
        </Button>
    </Container>
)

export default HomepageHeading