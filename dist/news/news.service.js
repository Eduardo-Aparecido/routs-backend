"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let NewsService = class NewsService {
    constructor() {
        this.cache = null;
        this.categoriesCache = null;
    }
    async findAll(query, category) {
        const CACHE_TIME = 10 * 60 * 1000;
        if (!query?.trim() &&
            !category &&
            this.cache &&
            this.cache.expiresAt > Date.now()) {
            console.log('Notícias carregadas do cache.');
            return this.cache.data;
        }
        try {
            const response = await axios_1.default.get('https://www.rioverde.go.gov.br/wp-json/wp/v2/posts', {
                params: {
                    per_page: 20,
                    _embed: true,
                    order: 'desc',
                    orderby: 'date',
                    page: 1,
                    ...(category ? { categories: category } : {}),
                },
                timeout: 10000,
            });
            let posts = response.data;
            if (query?.trim()) {
                const search = query
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                posts = posts.filter((post) => {
                    const title = post.title.rendered
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                    const content = post.content.rendered
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                    return title.includes(search) || content.includes(search);
                });
            }
            const data = {
                total: posts.length,
                articles: posts.map((post) => {
                    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
                    const featuredImage = featuredMedia?.media_details?.sizes?.large?.source_url ||
                        featuredMedia?.media_details?.sizes?.medium_large?.source_url ||
                        post.thumbnail ||
                        featuredMedia?.source_url ||
                        null;
                    const contentImageMatch = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
                    const image = featuredImage ||
                        contentImageMatch?.[1] ||
                        null;
                    const description = post.excerpt.rendered
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .trim() ||
                        post.content.rendered
                            .replace(/<[^>]*>/g, '')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .trim()
                            .slice(0, 250);
                    return {
                        id: String(post.id),
                        title: post.title.rendered,
                        description,
                        content: post.content.rendered,
                        url: post.link,
                        image,
                        publishedAt: post.date,
                        source: {
                            name: 'Prefeitura de Rio Verde',
                            url: 'https://www.rioverde.go.gov.br/',
                        },
                    };
                }),
            };
            if (!query?.trim() && !category) {
                this.cache = {
                    data,
                    expiresAt: Date.now() + CACHE_TIME,
                };
            }
            console.log(`Prefeitura de Rio Verde: ${data.articles.length} notícias carregadas.`);
            return data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                console.error('Erro ao consultar a API de notícias da Prefeitura:', error.response?.data);
                throw new common_1.BadGatewayException(`Não foi possível consultar as notícias da Prefeitura${status ? ` (${status})` : ''}.`);
            }
            console.error('Erro inesperado:', error);
            throw new common_1.BadGatewayException('Não foi possível consultar as notícias da Prefeitura.');
        }
    }
    async findCategories() {
        const CACHE_TIME = 60 * 60 * 1000;
        if (this.categoriesCache &&
            this.categoriesCache.expiresAt > Date.now()) {
            console.log('Categorias carregadas do cache.');
            return this.categoriesCache.data;
        }
        try {
            const response = await axios_1.default.get('https://www.rioverde.go.gov.br/wp-json/wp/v2/categories', {
                params: {
                    per_page: 100,
                    hide_empty: true,
                },
                timeout: 10000,
            });
            const categories = response.data
                .map((category) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
            }))
                .sort((a, b) => a.name.localeCompare(b.name));
            this.categoriesCache = {
                data: categories,
                expiresAt: Date.now() + CACHE_TIME,
            };
            console.log(`Prefeitura de Rio Verde: ${categories.length} categorias carregadas.`);
            return categories;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                console.error('Erro ao consultar as categorias da Prefeitura:', error.response?.data);
                throw new common_1.BadGatewayException(`Não foi possível consultar as categorias da Prefeitura${status ? ` (${status})` : ''}.`);
            }
            console.error('Erro inesperado:', error);
            throw new common_1.BadGatewayException('Não foi possível consultar as categorias da Prefeitura.');
        }
    }
};
exports.NewsService = NewsService;
exports.NewsService = NewsService = __decorate([
    (0, common_1.Injectable)()
], NewsService);
//# sourceMappingURL=news.service.js.map