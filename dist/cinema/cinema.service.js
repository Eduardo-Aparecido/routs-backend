"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CinemaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const cheerio = require("cheerio");
let CinemaService = class CinemaService {
    constructor() {
        this.cinemas = [
            {
                id: 'cine-a-rio-verde',
                name: 'Cine A Rio Verde',
                address: 'Avenida Presidente Vargas, 1740',
                city: 'Rio Verde - GO',
                description: 'Cinema localizado no Shopping Rio Verde, com programação de filmes em cartaz e lançamentos.',
                website: 'https://www.cinea.com.br/',
                programmingUrl: 'https://www.adorocinema.com/programacao/cinema-G0GTI/',
            },
            {
                id: 'cineflix-buriti-rio-verde',
                name: 'Cineflix Buriti Shopping Rio Verde',
                address: 'BR-060, 1044 - Parque Bougainville',
                city: 'Rio Verde - GO',
                description: 'Cinema do Buriti Shopping Rio Verde com programação de filmes, sessões e opções de compra de ingressos.',
                website: 'https://www.buritishoppingrioverde.com.br/',
                programmingUrl: 'https://www.adorocinema.com/programacao/cinema-F0620/',
            },
        ];
    }
    async findAll() {
        const cinemas = await Promise.all(this.cinemas.map(async (cinema) => {
            const movies = await this.getProgramming(cinema.programmingUrl);
            return {
                ...cinema,
                movies,
            };
        }));
        return {
            city: 'Rio Verde - GO',
            total: cinemas.length,
            cinemas,
        };
    }
    async getProgramming(url) {
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
                },
            });
            console.log('STATUS:', response.status);
            console.log('TAMANHO HTML:', response.data.length);
            const $ = cheerio.load(response.data);
            const movieCards = $('.movie-card-theater');
            console.log('CARDS ENCONTRADOS:', movieCards.length);
            const movies = [];
            movieCards.each((_, element) => {
                const movie = this.extractMovie($, element);
                if (movie) {
                    movies.push(movie);
                }
            });
            console.log('FILMES EXTRAÍDOS:', movies.length);
            return movies;
        }
        catch (error) {
            console.error(`Erro ao buscar programação: ${url}`, error);
            throw new common_1.InternalServerErrorException('Não foi possível consultar a programação do cinema.');
        }
    }
    createSlug(text) {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    extractMovie($, element) {
        const title = $(element)
            .find('.meta-title-link')
            .text()
            .trim();
        if (!title) {
            return null;
        }
        const id = this.createSlug(title);
        const poster = $(element).find('img.thumbnail-img').attr('data-src') ||
            $(element).find('img.thumbnail-img').attr('src') ||
            null;
        const releaseDate = $(element)
            .find('.meta-body-info .date')
            .text()
            .trim() || null;
        const genreElements = $(element).find('.meta-body-info .dark-grey-link');
        const genres = [];
        genreElements.each((_, genreElement) => {
            const genre = $(genreElement).text().trim();
            if (genre) {
                genres.push(genre);
            }
        });
        const directorElements = $(element).find('.meta-body-direction .dark-grey-link');
        const directors = [];
        directorElements.each((_, directorElement) => {
            const director = $(directorElement).text().trim();
            if (director) {
                directors.push(director);
            }
        });
        const castElements = $(element).find('.meta-body-actor .dark-grey-link');
        const cast = [];
        castElements.each((_, castElement) => {
            const actor = $(castElement).text().trim();
            if (actor) {
                cast.push(actor);
            }
        });
        const classification = $(element)
            .find('.certificate-text')
            .text()
            .trim() || null;
        const description = $(element)
            .find('.synopsis .content-txt')
            .text()
            .trim() || null;
        const sessionsMap = new Map();
        $(element)
            .find('.showtimes-hour-item')
            .each((_, sessionElement) => {
            const showtime = $(sessionElement).attr('data-showtime-time');
            const time = $(sessionElement)
                .find('.showtimes-hours-item-value')
                .text()
                .trim() || null;
            if (!showtime || !time) {
                return;
            }
            const date = showtime.split('T')[0];
            const version = $(sessionElement)
                .closest('.showtimes-version')
                .find('.text')
                .text()
                .trim();
            const language = version.includes('Dublado')
                ? 'Dublado'
                : version.includes('Legendado')
                    ? 'Legendado'
                    : version.includes('Original')
                        ? 'Original'
                        : 'Não informado';
            const experiencesAttribute = $(sessionElement).attr('data-experiences');
            let format = null;
            let accessibility = false;
            if (experiencesAttribute) {
                try {
                    const experiences = JSON.parse(experiencesAttribute);
                    const formats = [];
                    experiences.forEach((experience) => {
                        if (experience.includes('3D')) {
                            formats.push('3D');
                        }
                        if (experience.includes('Digital')) {
                            formats.push('Digital');
                        }
                        if (experience.includes('Accessibility')) {
                            accessibility = true;
                        }
                    });
                    format = formats.length
                        ? [...new Set(formats)].join(', ')
                        : null;
                }
                catch {
                    format = null;
                    accessibility = false;
                }
            }
            if (!sessionsMap.has(date)) {
                sessionsMap.set(date, []);
            }
            sessionsMap.get(date).push({
                time,
                language,
                format,
                accessibility,
            });
        });
        const sessions = Array.from(sessionsMap.entries()).map(([date, items]) => ({
            date,
            items,
        }));
        return {
            id,
            title,
            poster,
            releaseDate,
            genre: genres.join(', ') || null,
            director: directors.join(', ') || null,
            cast,
            classification,
            description,
            sessions,
        };
    }
};
exports.CinemaService = CinemaService;
exports.CinemaService = CinemaService = __decorate([
    (0, common_1.Injectable)()
], CinemaService);
//# sourceMappingURL=cinema.service.js.map