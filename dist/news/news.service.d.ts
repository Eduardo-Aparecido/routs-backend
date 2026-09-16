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
export interface NewsCategory {
    id: number;
    name: string;
    slug: string;
}
export declare class NewsService {
    private cache;
    private categoriesCache;
    findAll(query?: string, category?: number): Promise<NewsResponse>;
    findCategories(): Promise<NewsCategory[]>;
}
