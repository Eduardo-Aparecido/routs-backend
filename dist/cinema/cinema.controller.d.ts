import { CinemaService } from './cinema.service';
export declare class CinemaController {
    private readonly cinemaService;
    constructor(cinemaService: CinemaService);
    findAll(): Promise<import("./cinema.service").CinemaResponse>;
}
