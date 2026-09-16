export interface Restaurant {
    id: string;
    name: string;
    image: string | null;
    address: string | null;
    neighborhood: string | null;
    phone: string | null;
    instagram: string | null;
    mapsUrl: string | null;
}
export interface RestaurantResponse {
    city: string;
    total: number;
    restaurants: Restaurant[];
}
export declare class RestaurantService {
    private readonly baseUrl;
    private readonly headers;
    findAll(): Promise<RestaurantResponse>;
    private isPaginationUrl;
    private extractName;
    private extractImage;
    private extractField;
    private extractInstagram;
    private extractMapsUrl;
    private normalizeUrl;
    private createId;
    private slugify;
}
