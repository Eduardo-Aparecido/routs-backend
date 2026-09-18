"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const common_1 = require("@nestjs/common");
let WeatherService = class WeatherService {
    constructor() {
        this.latitude = -17.79;
        this.longitude = -50.92;
        this.apiUrl = 'https://api.open-meteo.com/v1/forecast';
    }
    async getCurrentWeather() {
        try {
            const params = new URLSearchParams({
                latitude: String(this.latitude),
                longitude: String(this.longitude),
                current: 'temperature_2m,weather_code,is_day',
                timezone: 'America/Sao_Paulo',
            });
            const response = await fetch(`${this.apiUrl}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Open-Meteo respondeu com status ${response.status}`);
            }
            const data = (await response.json());
            if (!data.current) {
                throw new Error('A Open-Meteo não retornou os dados atuais.');
            }
            const { temperature_2m, weather_code, is_day, time, } = data.current;
            return {
                city: 'Rio Verde',
                state: 'GO',
                temperature: Math.round(temperature_2m),
                condition: this.getWeatherCondition(weather_code),
                weatherCode: weather_code,
                isDay: is_day === 1,
                updatedAt: time,
            };
        }
        catch (error) {
            console.error('Erro ao consultar Open-Meteo:', error);
            throw new common_1.ServiceUnavailableException('Não foi possível obter o clima de Rio Verde no momento.');
        }
    }
    getWeatherCondition(weatherCode) {
        if (weatherCode === 0) {
            return 'Céu limpo';
        }
        if (weatherCode === 1) {
            return 'Predominantemente limpo';
        }
        if (weatherCode === 2) {
            return 'Parcialmente nublado';
        }
        if (weatherCode === 3) {
            return 'Nublado';
        }
        if (weatherCode === 45 ||
            weatherCode === 48) {
            return 'Neblina';
        }
        if (weatherCode === 51 ||
            weatherCode === 53 ||
            weatherCode === 55) {
            return 'Garoa';
        }
        if (weatherCode === 56 ||
            weatherCode === 57) {
            return 'Garoa congelante';
        }
        if (weatherCode === 61 ||
            weatherCode === 63 ||
            weatherCode === 65) {
            return 'Chuva';
        }
        if (weatherCode === 66 ||
            weatherCode === 67) {
            return 'Chuva congelante';
        }
        if (weatherCode === 71 ||
            weatherCode === 73 ||
            weatherCode === 75 ||
            weatherCode === 77) {
            return 'Neve';
        }
        if (weatherCode === 80 ||
            weatherCode === 81 ||
            weatherCode === 82) {
            return 'Pancadas de chuva';
        }
        if (weatherCode === 85 ||
            weatherCode === 86) {
            return 'Pancadas de neve';
        }
        if (weatherCode === 95 ||
            weatherCode === 96 ||
            weatherCode === 99) {
            return 'Trovoadas';
        }
        return 'Condição não informada';
    }
};
exports.WeatherService = WeatherService;
exports.WeatherService = WeatherService = __decorate([
    (0, common_1.Injectable)()
], WeatherService);
//# sourceMappingURL=weather.service.js.map