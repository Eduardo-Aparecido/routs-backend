import { NewsService } from './news.service';
export declare class NewsController {
    private readonly newsService;
    constructor(newsService: NewsService);
    findAll(query?: string): Promise<import("./news.service").NewsResponse>;
}
