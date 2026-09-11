import { ConfigService } from '@nestjs/config';
export interface NewsResponse {
    total: number;
    articles: {
        id: string;
        title: string;
        description: string;
        content: string;
        url: string;
        image: string | null;
        publishedAt: string;
        source: {
            name: string;
            url: string;
        };
    }[];
}
export declare class NewsService {
    private readonly config;
    private cache;
    constructor(config: ConfigService);
    findAll(query?: string): Promise<NewsResponse>;
}
