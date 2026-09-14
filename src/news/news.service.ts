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

  private normalizeText(text: string = ''): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isRioVerdeNews(article: GNewsArticle): boolean {
    const title = this.normalizeText(article.title);
    const description = this.normalizeText(article.description);

    const text = `${title} ${description}`;

    const rioVerde =
      text.includes('rio verde') ||
      text.includes('rioverde');

    if (!rioVerde) {
      return false;
    }

    const outrosEstados = [
      'acre',
      'alagoas',
      'amapa',
      'amazonas',
      'bahia',
      'ceara',
      'espirito santo',
      'maranhao',
      'mato grosso',
      'mato grosso do sul',
      'minas gerais',
      'para',
      'paraiba',
      'parana',
      'pernambuco',
      'piaui',
      'rio de janeiro',
      'rio grande do norte',
      'rio grande do sul',
      'rondonia',
      'roraima',
      'santa catarina',
      'sao paulo',
      'sergipe',
      'tocantins',
    ];

    const mencionaOutroEstado = outrosEstados.some((estado) =>
      text.includes(estado),
    );

    if (mencionaOutroEstado && !text.includes('goias')) {
      return false;
    }

    return true;
  }

  async findAll(query?: string) {
    const apiKey = this.config.get<string>('GNEWS_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GNEWS_API_KEY não configurada. Crie o arquivo .env a partir do .env.example.',
      );
    }

    const userQuery = query?.trim();

    const searchQuery = userQuery
      ? `"Rio Verde" AND (${userQuery})`
      : '"Rio Verde" AND (Goiás OR GO)';

    const CACHE_TIME = 10 * 60 * 1000;

    const cached = this.cache.get(searchQuery);

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`Notícias carregadas do cache: "${searchQuery}"`);
      return cached.data;
    }

    const max = Number(this.config.get<string>('GNEWS_MAX') || 50);

    try {
      console.log(`Consultando GNews: "${searchQuery}"`);

      const response = await axios.get<{
        totalArticles: number;
        articles: GNewsArticle[];
      }>('https://gnews.io/api/v4/search', {
        params: {
          q: searchQuery,
          in: 'title,description',
          lang: 'pt',
          country: 'br',
          sortby: 'publishedAt',
          max: Math.min(Math.max(max, 1), 100),
          apikey: apiKey,
        },
        timeout: 10000,
      });

      const filteredArticles = response.data.articles.filter((article) =>
        this.isRioVerdeNews(article),
      );

      const uniqueArticles = Array.from(
        new Map(
          filteredArticles.map((article) => [article.url, article]),
        ).values(),
      );

      const data: NewsResponse = {
        total: uniqueArticles.length,
        articles: uniqueArticles.map((article) => ({
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

      console.log(
        `GNews encontrou ${response.data.articles.length} artigos. ` +
          `${uniqueArticles.length} passaram pelo filtro do ROUTS.`,
      );

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

