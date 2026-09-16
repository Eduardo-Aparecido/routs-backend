"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const cheerio = require("cheerio");
let RestaurantService = class RestaurantService {
    constructor() {
        this.baseUrl = 'https://visiterioverde.com.br/gastronomia';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        };
    }
    async findAll() {
        try {
            console.log('========================================');
            console.log('ROUTS - Buscando restaurantes');
            console.log('Fonte:', this.baseUrl);
            console.log('========================================');
            const restaurants = [];
            const pagesToVisit = [this.baseUrl];
            const visitedPages = new Set();
            while (pagesToVisit.length > 0) {
                const pageUrl = pagesToVisit.shift();
                if (!pageUrl) {
                    continue;
                }
                if (visitedPages.has(pageUrl)) {
                    continue;
                }
                visitedPages.add(pageUrl);
                console.log('');
                console.log(`Buscando página ${visitedPages.size}:`, pageUrl);
                const response = await axios_1.default.get(pageUrl, {
                    headers: this.headers,
                    timeout: 15000,
                });
                console.log('STATUS:', response.status);
                console.log('TAMANHO HTML:', response.data.length);
                const $ = cheerio.load(response.data);
                $('.card-page').each((index, element) => {
                    const card = $(element);
                    const name = this.extractName(card);
                    if (!name) {
                        return;
                    }
                    const image = this.extractImage(card);
                    const address = this.extractField(card, 'Endereço');
                    const neighborhood = this.extractField(card, 'Bairro');
                    const phone = this.extractField(card, 'Telefone');
                    const instagram = this.extractInstagram(card);
                    const mapsUrl = this.extractMapsUrl(card);
                    const id = this.createId(name, address, restaurants.length +
                        index);
                    const alreadyExists = restaurants.some((restaurant) => restaurant.id === id);
                    if (alreadyExists) {
                        return;
                    }
                    restaurants.push({
                        id,
                        name,
                        image,
                        address,
                        neighborhood,
                        phone,
                        instagram,
                        mapsUrl,
                    });
                });
                $('a[href]').each((_, anchor) => {
                    const href = $(anchor)
                        .attr('href')
                        ?.trim();
                    if (!href) {
                        return;
                    }
                    const absoluteUrl = this.normalizeUrl(href);
                    if (!this.isPaginationUrl(absoluteUrl)) {
                        return;
                    }
                    if (!visitedPages.has(absoluteUrl) &&
                        !pagesToVisit.includes(absoluteUrl)) {
                        pagesToVisit.push(absoluteUrl);
                    }
                });
                console.log('TOTAL ATÉ AGORA:', restaurants.length);
                console.log('PÁGINAS NA FILA:', pagesToVisit.length);
            }
            console.log('');
            console.log('========================================');
            console.log(`TOTAL DE PÁGINAS VISITADAS: ${visitedPages.size}`);
            console.log(`RESTAURANTES ENCONTRADOS: ${restaurants.length}`);
            restaurants.forEach((restaurant, index) => {
                console.log(`${index + 1}. ${restaurant.name}`);
            });
            console.log('========================================');
            return {
                city: 'Rio Verde',
                total: restaurants.length,
                restaurants,
            };
        }
        catch (error) {
            console.error('ERRO AO BUSCAR RESTAURANTES:', error);
            throw new common_1.BadGatewayException('Não foi possível obter os restaurantes de Rio Verde.');
        }
    }
    isPaginationUrl(url) {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.hostname !==
                'visiterioverde.com.br') {
                return false;
            }
            if (parsedUrl.pathname !==
                '/gastronomia') {
                return false;
            }
            const page = parsedUrl.searchParams.get('page');
            if (!page) {
                return false;
            }
            const pageNumber = Number(page);
            return (Number.isInteger(pageNumber) &&
                pageNumber > 0);
        }
        catch {
            return false;
        }
    }
    extractName(card) {
        const name = card
            .find('.card-page-title')
            .first()
            .text()
            .trim();
        return name || null;
    }
    extractImage(card) {
        const image = card
            .find('img')
            .first();
        if (!image.length) {
            return null;
        }
        const src = image.attr('src') ||
            image.attr('data-src') ||
            image.attr('data-lazy-src') ||
            null;
        if (!src) {
            return null;
        }
        return this.normalizeUrl(src);
    }
    extractField(card, fieldName) {
        let value = null;
        card.find('p').each((_, paragraph) => {
            const paragraphElement = card.find(paragraph);
            const strongText = paragraphElement
                .find('strong')
                .first()
                .text()
                .trim()
                .replace(':', '')
                .trim();
            if (strongText.toLowerCase() !==
                fieldName.toLowerCase()) {
                return;
            }
            const clone = paragraphElement.clone();
            clone.find('strong').remove();
            const text = clone
                .text()
                .replace(/\s+/g, ' ')
                .replace(/^:\s*/, '')
                .trim();
            if (text) {
                value = text;
            }
        });
        return value;
    }
    extractInstagram(card) {
        let instagram = null;
        card.find('a[href]').each((_, anchor) => {
            const href = card
                .find(anchor)
                .attr('href')
                ?.trim();
            if (!href) {
                return;
            }
            if (href.includes('instagram.com/')) {
                instagram = href;
            }
        });
        return instagram;
    }
    extractMapsUrl(card) {
        let mapsUrl = null;
        card.find('a[href]').each((_, anchor) => {
            const href = card
                .find(anchor)
                .attr('href')
                ?.trim();
            if (!href) {
                return;
            }
            if (href.includes('maps.app.goo.gl') ||
                href.includes('google.com/maps') ||
                href.includes('g.co/')) {
                mapsUrl = href;
            }
        });
        return mapsUrl;
    }
    normalizeUrl(url) {
        try {
            return new URL(url, 'https://visiterioverde.com.br').toString();
        }
        catch {
            return url;
        }
    }
    createId(name, address, index) {
        const base = [
            name,
            address,
        ]
            .filter(Boolean)
            .join(' ');
        const slug = this.slugify(base);
        return (slug ||
            `restaurant-${index + 1}`);
    }
    slugify(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
};
exports.RestaurantService = RestaurantService;
exports.RestaurantService = RestaurantService = __decorate([
    (0, common_1.Injectable)()
], RestaurantService);
//# sourceMappingURL=restaurant.service.js.map