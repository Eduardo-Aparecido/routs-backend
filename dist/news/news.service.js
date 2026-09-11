"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let NewsService = class NewsService {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
    }
    async findAll(query) {
        const apiKey = this.config.get('GNEWS_API_KEY');
        if (!apiKey) {
            throw new common_1.InternalServerErrorException('GNEWS_API_KEY não configurada. Crie o arquivo .env a partir do .env.example.');
        }
        const searchQuery = query?.trim() || 'Rio Verde';
        const CACHE_TIME = 10 * 60 * 1000;
        const cached = this.cache.get(searchQuery);
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`Notícias carregadas do cache: "${searchQuery}"`);
            return cached.data;
        }
        const max = Number(this.config.get('GNEWS_MAX') || 20);
        try {
            console.log(`Consultando GNews: "${searchQuery}"`);
            const response = await axios_1.default.get('https://gnews.io/api/v4/search', {
                params: {
                    q: searchQuery,
                    lang: 'pt',
                    country: 'br',
                    sortby: 'publishedAt',
                    max: Math.min(Math.max(max, 1), 100),
                    apikey: apiKey,
                },
                timeout: 10000,
            });
            const data = {
                total: response.data.totalArticles,
                articles: response.data.articles.map((article) => ({
                    id: article.id,
                    title: article.title,
                    description: article.description,
                    content: article.content ?? '',
                    url: article.url,
                    image: article.image ?? null,
                    publishedAt: article.publishedAt,
                    source: article.source,
                })),
            };
            this.cache.set(searchQuery, {
                data,
                expiresAt: Date.now() + CACHE_TIME,
            });
            return data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                const message = error.response?.data?.errors?.join?.(', ');
                console.error('Erro retornado pela GNews:', error.response?.data);
                throw new common_1.BadGatewayException(message ||
                    `Erro ao consultar GNews${status ? ` (${status})` : ''}.`);
            }
            console.error('Erro inesperado:', error);
            throw new common_1.BadGatewayException('Não foi possível consultar as notícias.');
        }
    }
};
exports.NewsService = NewsService;
exports.NewsService = NewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NewsService);
//# sourceMappingURL=news.service.js.map