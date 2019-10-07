import {Grid, Header, Image, Segment} from "semantic-ui-react";
import React from "react";

const HomepageContent = () => <Segment style={{padding: '8em 0em'}} vertical>
    <Grid container stackable verticalAlign='middle'>
        <Grid.Row>
            <Grid.Column width={8}>
                <Header as='h3' style={{fontSize: '2em'}}>
                    Free Yourself
                </Header>
                <p style={{fontSize: '1.33em'}}>
                    Truly own your data.
                </p>
                <Header as='h3' style={{fontSize: '2em'}}>
                    Decentralize
                </Header>
                <p style={{fontSize: '1.33em'}}>
                    No need to rely on MegaCorp's services anymore. You host your own service in a peer-to-peer network.
                </p>
            </Grid.Column>
            <Grid.Column floated='right' width={6}>
                <Image bordered rounded size='large' src='/images/wireframe/white-image.png'/>
            </Grid.Column>
        </Grid.Row>
    </Grid>
</Segment>

export default HomepageContent