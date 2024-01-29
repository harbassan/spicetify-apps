import React from "react";

const genreLine = (name: string, value: number, limit: number, total: number) => {
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
            <span className="stats-genreValue">{Math.round((value / total) * 100) + "%"}</span>
        </div>
    );
};

const genreLines = (genres: [string, number][], total: number) => {
    return genres.map(([genre, value]) => {
        return genreLine(genre, value, genres[0][1], total);
    });
};

const genresCard = ({ genres, total }: { genres: [string, number][]; total: number }) => {
    const genresArray = genres.sort(([, a]: [string, any], [, b]: [string, any]) => b - a).slice(0, 10);

    return <div className={`main-card-card stats-genreCard`}>{genreLines(genresArray, total)}</div>;
};

export default genresCard;
