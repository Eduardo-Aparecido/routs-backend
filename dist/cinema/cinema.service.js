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
        this.cineAUrl = 'https://cinea.com.br/cine-a-rio-verde/programacao';
        this.cineflixApiUrl = 'https://cineflix.com.br/api/SessionController/getSessionsByDate';
        this.cineflixWebsite = 'https://cineflix.com.br';
        this.cineflixCinemaCode = 'RVD';
        this.city = 'Rio Verde';
    }
    async getCinema() {
        const [cineA, cineflix] = await Promise.all([
            this.getCineA(),
            this.getCineflix(),
        ]);
        return {
            city: this.city,
            cinemas: [
                cineA,
                cineflix,
            ],
        };
    }
    async findAll() {
        return this.getCinema();
    }
    async getCineA() {
        console.log('------------------------------------------');
        console.log('CINE A');
        console.log('------------------------------------------');
        try {
            const response = await axios_1.default.get(this.cineAUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                },
            });
            const html = response.data;
            console.log('STATUS:', response.status);
            console.log('TAMANHO HTML:', html.length);
            const $ = cheerio.load(html);
            const movies = await this.parseCineAProgram($);
            console.log('FILMES EXTRAÍDOS CINE A:', movies.length);
            return {
                id: 'cinea-rio-verde',
                name: 'Cine A',
                address: 'Avenida Presidente Vargas, 1740',
                city: this.city,
                description: 'Cinema Cine A em Rio Verde com programação atualizada de filmes e horários.',
                website: 'https://cinea.com.br',
                programmingUrl: this.cineAUrl,
                movies,
            };
        }
        catch (error) {
            console.error('ERRO AO EXTRAIR CINE A:', error);
            throw new common_1.BadGatewayException('Não foi possível obter a programação do Cine A.');
        }
    }
    async parseCineAProgram($) {
        const programMovies = [];
        const seenUrls = new Set();
        $('h3').each((_index, element) => {
            const link = $(element)
                .find('a[href*="/cine-a-rio-verde/filme/"]')
                .first();
            if (!link.length)
                return;
            const href = link.attr('href');
            if (!href)
                return;
            const movieUrl = this.resolveUrl(href, this.cineAUrl);
            if (seenUrls.has(movieUrl))
                return;
            seenUrls.add(movieUrl);
            const title = this.cleanText(link.text());
            if (!title)
                return;
            programMovies.push({
                url: movieUrl,
                title,
                poster: null,
                releaseDate: null,
                genre: null,
                classification: null,
                duration: null,
            });
        });
        console.log('FILMES ENCONTRADOS NA PROGRAMAÇÃO CINE A:', programMovies.length);
        const results = await Promise.all(programMovies.map(async (programMovie) => {
            try {
                return await this.parseCineASinglePage(programMovie);
            }
            catch (error) {
                console.error('ERRO AO EXTRAIR SINGLE PAGE CINE A:', programMovie.title, programMovie.url, error);
                return null;
            }
        }));
        return results.filter((movie) => movie !== null);
    }
    async parseCineASinglePage(programMovie) {
        const response = await axios_1.default.get(programMovie.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                Referer: this.cineAUrl,
            },
        });
        const $ = cheerio.load(response.data);
        const pageText = this.cleanText($('body').text());
        const title = this.cleanText($('h1')
            .first()
            .text()) ||
            programMovie.title;
        const classification = this.extractCineAClassification(this.cleanText($('.movie-card-rating')
            .first()
            .text())) ||
            this.extractCineAClassification(pageText) ||
            programMovie.classification;
        const duration = this.extractCineADuration(pageText) ||
            programMovie.duration;
        const genre = this.extractCineASinglePageGenre($) ||
            programMovie.genre;
        const poster = this.extractCineASinglePagePoster($) ||
            programMovie.poster;
        const description = this.extractCineASection($, 'Sinopse');
        const cast = this.extractCineACast($);
        const director = this.extractCineAField($, 'Direção');
        const sessions = this.extractCineASinglePageSessions($);
        const movieId = this.extractCineAMovieId(programMovie.url);
        return {
            id: movieId
                ? `cinea-${movieId}`
                : `cinea-${this.slugify(title)}`,
            title,
            poster,
            releaseDate: programMovie.releaseDate,
            genre,
            director,
            cast,
            classification,
            description,
            duration,
            movieUrl: programMovie.url,
            sessions,
        };
    }
    extractCineASinglePagePoster($) {
        const image = $('img')
            .filter((_, element) => {
            const alt = this.normalizeText($(element).attr('alt') ?? '');
            return (alt.includes('POSTER') ||
                alt.includes('HOMEM-ARANHA') ||
                alt.includes('FILME'));
        })
            .first();
        const fallback = image.length
            ? image
            : $('img')
                .filter((_, element) => ($(element).attr('src') ?? '').includes('moviehub'))
                .first();
        if (!fallback.length) {
            return null;
        }
        const attributes = [
            'src',
            'data-src',
            'data-lazy-src',
            'data-original',
            'ng-src',
        ];
        for (const attribute of attributes) {
            const value = fallback.attr(attribute);
            if (value &&
                value.trim()) {
                return this.resolveUrl(value.trim(), this.cineAUrl);
            }
        }
        return null;
    }
    extractCineASinglePageGenre($) {
        const technicalField = this.extractCineAField($, 'Gênero');
        if (technicalField) {
            return technicalField;
        }
        const firstText = this.cleanText($('body')
            .find('h1')
            .first()
            .parent()
            .text());
        const knownGenres = [
            'Ação',
            'Animação',
            'Aventura',
            'Biografia',
            'Comédia',
            'Crime',
            'Documentário',
            'Drama',
            'Fantasia',
            'Ficção-científica',
            'Infantil',
            'Musical',
            'Romance',
            'Suspense',
            'Terror',
        ];
        for (const genre of knownGenres) {
            if (this.normalizeText(firstText).includes(this.normalizeText(genre))) {
                return genre;
            }
        }
        return null;
    }
    extractCineAField($, label) {
        let result = null;
        $('body *').each((_, element) => {
            if (result) {
                return;
            }
            const text = this.cleanText($(element).text());
            const normalizedText = this.normalizeText(text);
            const normalizedLabel = this.normalizeText(label);
            if (normalizedText ===
                normalizedLabel) {
                const next = $(element)
                    .next();
                if (next.length) {
                    const value = this.cleanText(next.text());
                    if (value &&
                        this.normalizeText(value) !==
                            normalizedLabel) {
                        result =
                            value;
                    }
                }
            }
            if (normalizedText.startsWith(`${normalizedLabel} `)) {
                const value = text
                    .substring(label.length)
                    .trim();
                if (value) {
                    result =
                        value;
                }
            }
        });
        return result;
    }
    extractCineASection($, headingText) {
        const heading = $('h2, h3, h4')
            .filter((_, element) => this.normalizeText($(element).text()) ===
            this.normalizeText(headingText))
            .first();
        if (!heading.length) {
            return null;
        }
        const parts = [];
        let current = heading.next();
        let safety = 0;
        while (current.length &&
            safety < 20) {
            const tagName = current
                .get(0)
                ?.name
                ?.toLowerCase();
            if (tagName === 'h2' ||
                tagName === 'h3' ||
                tagName === 'h4') {
                break;
            }
            const text = this.cleanText(current.text());
            if (text) {
                parts.push(text);
            }
            current =
                current.next();
            safety++;
        }
        if (parts.length) {
            return this.cleanText(parts.join(' '));
        }
        return null;
    }
    extractCineACast($) {
        const value = this.extractCineASection($, 'Elenco');
        if (!value) {
            return [];
        }
        return value
            .split(',')
            .map((name) => this.cleanText(name))
            .filter(Boolean);
    }
    extractCineATrailerFromElement($, element) {
        const button = $(element)
            .find('[onclick*="setTrailer"]')
            .first();
        if (!button.length) {
            return null;
        }
        const onclick = button.attr('onclick') ?? '';
        const match = onclick.match(/setTrailer\(\s*['"]([^'"]+)['"]/i);
        if (!match) {
            return null;
        }
        return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    extractCineATrailer($, container) {
        const iframe = container
            .find('iframe')
            .first();
        if (iframe.length) {
            const src = iframe.attr('src');
            if (src) {
                return this.resolveUrl(src, this.cineAUrl);
            }
        }
        const trailerButton = container
            .find('[onclick*="setTrailer"]')
            .first();
        if (trailerButton.length) {
            const onclick = trailerButton.attr('onclick') ?? '';
            const match = onclick.match(/setTrailer\(\s*['"]([^'"]+)['"]/i);
            if (match) {
                return `https://www.youtube.com/watch?v=${match[1]}`;
            }
        }
        let trailer = null;
        container
            .find('a')
            .each((_, link) => {
            if (trailer) {
                return;
            }
            const href = $(link).attr('href');
            if (!href) {
                return;
            }
            if (href.includes('youtube.com') ||
                href.includes('youtu.be')) {
                trailer =
                    this.resolveUrl(href, this.cineAUrl);
            }
        });
        return trailer;
    }
    extractCineASinglePageSessions($) {
        const grouped = new Map();
        const seen = new Set();
        $('a')
            .filter((_, element) => {
            const text = this.normalizeText($(element).text());
            const aria = this.normalizeText($(element).attr('aria-label') ?? '');
            return (text.includes('COMPRAR') ||
                aria.includes('COMPRAR'));
        })
            .each((_, element) => {
            const link = $(element);
            const text = this.cleanText(link.text());
            const ariaLabel = this.cleanText(link.attr('aria-label') ?? '');
            const combined = `${ariaLabel} ${text}`;
            const times = this.extractTimes(combined);
            if (!times.length) {
                return;
            }
            const date = this.extractCineASessionDate(combined);
            if (!date) {
                return;
            }
            const parent = link.parent();
            const broaderParent = parent.parent();
            const context = this.cleanText(`${parent.text()} ${broaderParent.text()} ${combined}`);
            const room = this.extractRoom(context);
            const language = this.extractLanguage(context);
            const format = this.extractFormat(context);
            const accessibility = this.isAccessible(context);
            for (const time of times) {
                const key = `${date}-${time}-${room ?? ''}-${language}-${format ?? ''}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                const items = grouped.get(date) ?? [];
                items.push({
                    time,
                    language,
                    format,
                    accessibility,
                    room,
                });
                grouped.set(date, items);
            }
        });
        const result = Array.from(grouped.entries()).map(([date, items,]) => ({
            date,
            items,
        }));
        result.sort((a, b) => a.date.localeCompare(b.date));
        for (const day of result) {
            day.items.sort((a, b) => a.time.localeCompare(b.time));
        }
        return result;
    }
    extractCineASessionDate(text) {
        const match = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
        if (!match) {
            return null;
        }
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    extractCineAMovieId(url) {
        const match = url.match(/\/filme\/(\d+)\//i);
        return match
            ? match[1]
            : null;
    }
    parseCineAReleaseDate(text) {
        const match = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
        if (!match) {
            return null;
        }
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    extractCineAClassification(text) {
        const normalized = this.cleanText(text);
        const match = normalized.match(/(?:^|\s)(L|10|12|14|16|18|AL)(?:\s|$)/i);
        if (match) {
            return match[1].toUpperCase();
        }
        return null;
    }
    extractCineADuration(text) {
        const normalized = this.cleanText(text);
        const match = normalized.match(/\b(\d{1,2}h\s*\d{1,2}\s*min)\b/i);
        if (match) {
            return match[1]
                .replace(/\s+/g, ' ')
                .replace(/(\d)h\s*(\d)/i, '$1h $2');
        }
        const hoursOnly = normalized.match(/\b(\d{1,2})h\b/i);
        if (hoursOnly) {
            return `${hoursOnly[1]}h`;
        }
        const minutes = normalized.match(/\b(\d{1,3})\s*min\b/i);
        if (minutes) {
            return `${minutes[1]} min`;
        }
        return null;
    }
    extractCineASessions($, container, date) {
        const sessions = [];
        const seen = new Set();
        container
            .find('a')
            .each((_, link) => {
            const text = this.cleanText($(link).text());
            const times = this.extractTimes(text);
            if (!times.length) {
                return;
            }
            const parent = $(link).parent();
            const context = this.cleanText(parent.text());
            const broaderContext = this.cleanText(parent
                .parent()
                .text());
            const combined = `${context} ${broaderContext}`;
            const room = this.extractRoom(combined);
            const language = this.extractLanguage(combined);
            const format = this.extractFormat(combined);
            const accessibility = this.isAccessible(combined);
            for (const time of times) {
                const key = `${time}-${room ?? ''}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                sessions.push({
                    time,
                    language,
                    format,
                    accessibility,
                    room,
                });
            }
        });
        if (!sessions.length) {
            return [];
        }
        return [
            {
                date: date ??
                    this.getBrazilDate(),
                items: sessions,
            },
        ];
    }
    mergeSessionDays(existing, incoming) {
        const result = existing.map((day) => ({
            date: day.date,
            items: [
                ...day.items,
            ],
        }));
        for (const incomingDay of incoming) {
            const existingDay = result.find((day) => day.date ===
                incomingDay.date);
            if (!existingDay) {
                result.push({
                    date: incomingDay.date,
                    items: [
                        ...incomingDay.items,
                    ],
                });
                continue;
            }
            const existingKeys = new Set(existingDay.items.map((item) => `${item.time}-${item.room ?? ''}-${item.language}-${item.format ?? ''}`));
            for (const item of incomingDay.items) {
                const key = `${item.time}-${item.room ?? ''}-${item.language}-${item.format ?? ''}`;
                if (!existingKeys.has(key)) {
                    existingDay.items.push(item);
                    existingKeys.add(key);
                }
            }
        }
        result.sort((a, b) => a.date.localeCompare(b.date));
        for (const day of result) {
            day.items.sort((a, b) => a.time.localeCompare(b.time));
        }
        return result;
    }
    extractTimes(text) {
        const matches = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g);
        if (!matches) {
            return [];
        }
        return Array.from(new Set(matches));
    }
    extractRoom(text) {
        const match = text.match(/\bSala\s*\d+\b/i);
        return match
            ? this.cleanText(match[0])
            : null;
    }
    extractLanguage(text) {
        const normalized = this.normalizeText(text);
        if (normalized.includes('DUBLADO')) {
            return 'Dublado';
        }
        if (normalized.includes('LEGENDADO')) {
            return 'Legendado';
        }
        if (normalized.includes('NAC')) {
            return 'Nacional';
        }
        return 'Nacional';
    }
    extractFormat(text) {
        const normalized = this.normalizeText(text);
        if (normalized.includes('IMAX')) {
            return 'IMAX';
        }
        if (normalized.includes('3D')) {
            return '3D';
        }
        if (normalized.includes('2D')) {
            return '2D';
        }
        if (normalized.includes('DIGITAL')) {
            return 'Digital';
        }
        return null;
    }
    isAccessible(text) {
        const normalized = this.normalizeText(text);
        return (normalized.includes('ACESSIBILIDADE') ||
            normalized.includes('ACESSIVEL') ||
            normalized.includes('LIBRAS') ||
            normalized.includes('AUDIODESCRICAO'));
    }
    async getCineflix() {
        console.log('------------------------------------------');
        console.log('CINEFLIX');
        console.log('------------------------------------------');
        const date = this.getBrazilDate();
        try {
            const response = await axios_1.default.post(this.cineflixApiUrl, {
                cSiglaCinema: this.cineflixCinemaCode,
                dtDataSessao: date,
            }, {
                timeout: 30000,
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    Origin: this.cineflixWebsite,
                    Referer: `${this.cineflixWebsite}/`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36',
                },
            });
            const data = response.data;
            const filmes = Array.isArray(data?.filmes)
                ? data.filmes
                : [];
            console.log('STATUS:', response.status);
            console.log('FILMES RECEBIDOS CINEFLIX:', filmes.length);
            const movies = filmes
                .map((movie) => this.mapCineflixMovie(movie, date))
                .filter((movie) => movie !== null);
            console.log('FILMES EXTRAÍDOS CINEFLIX:', movies.length);
            return {
                id: 'cineflix-rio-verde',
                name: 'Cineflix Buriti Shopping',
                address: 'Buriti Shopping Rio Verde - BR-060',
                city: this.city,
                description: 'Cinema Cineflix no Buriti Shopping Rio Verde com programação atualizada.',
                website: this.cineflixWebsite,
                programmingUrl: `${this.cineflixWebsite}/fullSchedule/${this.cineflixCinemaCode}/${date}`,
                movies,
            };
        }
        catch (error) {
            console.error('ERRO AO EXTRAIR CINEFLIX:', error);
            throw new common_1.BadGatewayException('Não foi possível obter a programação do Cineflix.');
        }
    }
    mapCineflixMovie(movie, date) {
        const title = this.cleanText(movie.cTitulo ?? '');
        if (!title) {
            return null;
        }
        const id = movie.iCodFilmeSite
            ? `cineflix-${movie.iCodFilmeSite}`
            : `cineflix-${this.slugify(title)}`;
        return {
            id,
            title,
            poster: this.buildCineflixPoster(movie.cHashMidia),
            releaseDate: null,
            genre: this.cleanNullable(movie.cGenero),
            director: null,
            cast: [],
            classification: this.cleanNullable(movie.iClassificacao),
            description: this.cleanNullable(movie.cSinopse),
            duration: this.formatCineflixDuration(movie.tDuracao),
            movieUrl: movie.cSlug
                ? `${this.cineflixWebsite}/filmes/${movie.cSlug}`
                : null,
            sessions: this.mapCineflixSessions(movie.sessoes ?? [], date),
        };
    }
    mapCineflixSessions(sessions, fallbackDate) {
        const grouped = new Map();
        for (const session of sessions) {
            const date = session.dtSessao ||
                fallbackDate;
            const time = this.formatTime(session.tHorario);
            if (!time) {
                continue;
            }
            const exhibition = session.cTipoExibicao ??
                '';
            const item = {
                time,
                language: this.mapCineflixLanguage(exhibition),
                format: this.mapCineflixFormat(exhibition),
                accessibility: Boolean(session.selo),
                room: this.cleanNullable(session.cNomeSala),
            };
            const existing = grouped.get(date) ?? [];
            existing.push(item);
            grouped.set(date, existing);
        }
        return Array.from(grouped.entries()).map(([date, items,]) => ({
            date,
            items,
        }));
    }
    mapCineflixLanguage(type) {
        const normalized = this.normalizeText(type);
        if (normalized === 'L' ||
            normalized.includes('LEGENDADO')) {
            return 'Legendado';
        }
        if (normalized === 'D' ||
            normalized.includes('DUBLADO')) {
            return 'Dublado';
        }
        if (normalized === 'N' ||
            normalized.includes('NACIONAL')) {
            return 'Nacional';
        }
        return 'Nacional';
    }
    mapCineflixFormat(type) {
        const normalized = this.normalizeText(type);
        if (normalized.includes('3D')) {
            return '3D';
        }
        if (normalized.includes('IMAX')) {
            return 'IMAX';
        }
        if (normalized === 'D' ||
            normalized === 'L' ||
            normalized === 'N') {
            return '2D';
        }
        return null;
    }
    buildCineflixPoster(hash) {
        if (!hash) {
            return null;
        }
        if (hash.startsWith('http://') ||
            hash.startsWith('https://')) {
            return hash;
        }
        return `https://cdn.cineflix.com.br/midia/${hash}`;
    }
    formatCineflixDuration(value) {
        if (!value) {
            return null;
        }
        const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
        if (!match) {
            return value;
        }
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (hours === 0) {
            return `${minutes} min`;
        }
        return `${hours}h ${minutes}min`;
    }
    formatTime(value) {
        if (!value) {
            return null;
        }
        const match = value.match(/^(\d{2}):(\d{2})/);
        if (!match) {
            return null;
        }
        return `${match[1]}:${match[2]}`;
    }
    getBrazilDate() {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(new Date());
    }
    cleanText(value) {
        return value
            .replace(/\s+/g, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();
    }
    cleanNullable(value) {
        if (value === undefined ||
            value === null) {
            return null;
        }
        const cleaned = this.cleanText(value);
        return cleaned
            ? cleaned
            : null;
    }
    normalizeText(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();
    }
    slugify(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    resolveUrl(value, base) {
        try {
            return new URL(value, base).toString();
        }
        catch {
            return value;
        }
    }
};
exports.CinemaService = CinemaService;
exports.CinemaService = CinemaService = __decorate([
    (0, common_1.Injectable)()
], CinemaService);
//# sourceMappingURL=cinema.service.js.map