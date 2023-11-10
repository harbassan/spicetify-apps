import React from "react";

const StatCard = (props: any) => {
    return (
        <>
            <div className="main-card-card">
                <div draggable="true" className="main-card-draggable">
                    <div className="stats-cardValue">{props.value}</div>
                    <div>
                        <div
                            className="TypeElement-balladBold-textBase-4px-type main-cardHeader-text stats-cardText"
                            data-encore-id="type"
                        >
                            {props.stat}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(StatCard);
