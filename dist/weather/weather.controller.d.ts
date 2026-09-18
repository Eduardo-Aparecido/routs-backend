import { WeatherService } from './weather.service';
export declare class WeatherController {
    private readonly weatherService;
    constructor(weatherService: WeatherService);
    getCurrentWeather(): Promise<import("./weather.service").WeatherResponse>;
}
