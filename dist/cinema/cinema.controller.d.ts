import { CinemaService } from './cinema.service';
export declare class CinemaController {
    private readonly cinemaService;
    constructor(cinemaService: CinemaService);
    findAll(): Promise<{
        city: string;
        total: number;
        cinemas: {
            movies: import("./cinema.service").Movie[];
            id: string;
            name: string;
            address: string;
            city: string;
            description: string;
            website: string;
            programmingUrl: string;
        }[];
    }>;
}
