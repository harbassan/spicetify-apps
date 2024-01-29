import React from "react";

interface ShelfProps {
    title: string;
    children: React.ReactElement | React.ReactElement[];
}

function Shelf(props: ShelfProps): React.ReactElement {
    const { TextComponent } = Spicetify.ReactComponent;
    const { title, children } = props;

    return (
        <section className="main-shelf-shelf Shelf">
            <div className="main-shelf-header">
                <div className="main-shelf-topRow">
                    <div className="main-shelf-titleWrapper">
                        <TextComponent children={title} as="h2" variant="canon" semanticColor="textBase" />
                    </div>
                </div>
            </div>
            <section>{children}</section>
        </section>
    );
}

export default React.memo(Shelf);
