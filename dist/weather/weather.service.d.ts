export interface WeatherResponse {
    city: string;
    state: string;
    temperature: number;
    condition: string;
    weatherCode: number;
    isDay: boolean;
    updatedAt: string;
}
export declare class WeatherService {
    private readonly latitude;
    private readonly longitude;
    private readonly apiUrl;
    getCurrentWeather(): Promise<WeatherResponse>;
    private getWeatherCondition;
}
