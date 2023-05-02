import React from "react";

const genreLine = (name: string, value: number, limit: number) => {
    return (
        <div className="stats-genreRow">
            <div
                className="stats-genreRowFill"
                style={{
                    width: `calc(${(value / limit) * 100}% + ${((limit - value) / (limit - 1)) * 100}px)`,
                }}
            >
                <span className="stats-genreText">{name}</span>
            </div>
            <span className="stats-genreValue">{Math.round((value / 50) * 100) + "%"}</span>
        </div>
    );
};

const genreLines = (genres: [string, number][]) => {
    return genres.map(([genre, value]) => {
        return genreLine(genre, value, genres[0][1]);
    });
};

const genresCard = ({ genres }: { genres: [string, number][] }) => {
    const genresArray = genres.sort(([, a]: [string, any], [, b]: [string, any]) => b - a).slice(0, 10);

    return <div className={`main-card-card stats-genreCard`}>{genreLines(genresArray)}</div>;
};

export default React.memo(genresCard);
