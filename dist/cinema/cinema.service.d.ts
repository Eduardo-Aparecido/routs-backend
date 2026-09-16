export interface SessionItem {
    time: string;
    language: string;
    format: string | null;
    accessibility: boolean;
    room: string | null;
}
export interface SessionDay {
    date: string;
    items: SessionItem[];
}
export interface Movie {
    id: string;
    title: string;
    poster: string | null;
    releaseDate: string | null;
    genre: string | null;
    director: string | null;
    cast: string[];
    classification: string | null;
    description: string | null;
    duration: string | null;
    movieUrl: string | null;
    sessions: SessionDay[];
}
export interface Cinema {
    id: string;
    name: string;
    address: string;
    city: string;
    description: string;
    website: string;
    programmingUrl: string;
    movies: Movie[];
}
export interface CinemaResponse {
    city: string;
    cinemas: Cinema[];
}
export declare class CinemaService {
    private readonly cineAUrl;
    private readonly cineflixApiUrl;
    private readonly cineflixWebsite;
    private readonly cineflixCinemaCode;
    private readonly city;
    getCinema(): Promise<CinemaResponse>;
    findAll(): Promise<CinemaResponse>;
    private getCineA;
    private parseCineAProgram;
    private parseCineASinglePage;
    private extractCineASinglePagePoster;
    private extractCineASinglePageGenre;
    private extractCineAField;
    private extractCineASection;
    private extractCineACast;
    private extractCineATrailerFromElement;
    private extractCineATrailer;
    private extractCineASinglePageSessions;
    private extractCineASessionDate;
    private extractCineAMovieId;
    private parseCineAReleaseDate;
    private extractCineAClassification;
    private extractCineADuration;
    private extractCineASessions;
    private mergeSessionDays;
    private extractTimes;
    private extractRoom;
    private extractLanguage;
    private extractFormat;
    private isAccessible;
    private getCineflix;
    private mapCineflixMovie;
    private mapCineflixSessions;
    private mapCineflixLanguage;
    private mapCineflixFormat;
    private buildCineflixPoster;
    private formatCineflixDuration;
    private formatTime;
    private getBrazilDate;
    private cleanText;
    private cleanNullable;
    private normalizeText;
    private slugify;
    private resolveUrl;
}
