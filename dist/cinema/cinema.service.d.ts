export interface SessionItem {
    time: string;
    language: string;
    format: string | null;
    accessibility: boolean;
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
export declare class CinemaService {
    private readonly cinemas;
    findAll(): Promise<{
        city: string;
        total: number;
        cinemas: {
            movies: Movie[];
            id: string;
            name: string;
            address: string;
            city: string;
            description: string;
            website: string;
            programmingUrl: string;
        }[];
    }>;
    private getProgramming;
    private createSlug;
    private extractMovie;
}
