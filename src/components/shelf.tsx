import React from "react";

interface ShelfProps {
    title?: string
    children: React.ReactElement
}

function Shelf({ title, children }: ShelfProps): React.ReactElement {
    return (
        <section className="main-shelf-shelf Shelf">
            <div className="main-shelf-header">
                <div className="main-shelf-topRow">
                    <div className="main-shelf-titleWrapper">
                        <Spicetify.ReactComponent.TextComponent
                            children={title}
                            as="h2"
                            variant="canon"
                            semanticColor="textBase"
                        ></Spicetify.ReactComponent.TextComponent>
                    </div>
                </div>
            </div>
            <section>
                {children}
            </section>
        </section>
    )
}

export default Shelf;
