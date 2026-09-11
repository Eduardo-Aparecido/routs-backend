import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GNewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

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

@Injectable()
export class NewsService {
  private cache = new Map<
    string,
    {
      data: NewsResponse;
      expiresAt: number;
    }
  >();

  constructor(private readonly config: ConfigService) {}

  async findAll(query?: string) {
    const apiKey = this.config.get<string>('GNEWS_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GNEWS_API_KEY não configurada. Crie o arquivo .env a partir do .env.example.',
      );
    }

    const searchQuery = query?.trim() || 'Rio Verde';

    // Tempo do cache: 10 minutos
    const CACHE_TIME = 10 * 60 * 1000;

    const cached = this.cache.get(searchQuery);

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`Notícias carregadas do cache: "${searchQuery}"`);
      return cached.data;
    }

    const max = Number(this.config.get<string>('GNEWS_MAX') || 20);

    try {
      console.log(`Consultando GNews: "${searchQuery}"`);

      const response = await axios.get<{
        totalArticles: number;
        articles: GNewsArticle[];
      }>('https://gnews.io/api/v4/search', {
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

      const data: NewsResponse = {
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.errors?.join?.(', ');

        console.error(
          'Erro retornado pela GNews:',
          error.response?.data,
        );

        throw new BadGatewayException(
          message ||
            `Erro ao consultar GNews${status ? ` (${status})` : ''}.`,
        );
      }

      console.error('Erro inesperado:', error);

      throw new BadGatewayException(
        'Não foi possível consultar as notícias.',
      );
    }
  }
}