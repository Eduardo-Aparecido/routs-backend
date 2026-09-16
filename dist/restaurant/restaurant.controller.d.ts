import { RestaurantService } from './restaurant.service';
export declare class RestaurantController {
    private readonly restaurantService;
    constructor(restaurantService: RestaurantService);
    findAll(): Promise<import("./restaurant.service").RestaurantResponse>;
}
