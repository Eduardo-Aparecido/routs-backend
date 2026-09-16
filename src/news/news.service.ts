import {
  BadGatewayException,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';

interface WordPressPost {
  id: number;
  date: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  thumbnail?: string;
  postCategories?: {
    id: number;
    name: string;
    slug: string;
  }[];
  _embedded?: {
    'wp:featuredmedia'?: {
      source_url?: string;
      media_details?: {
        sizes?: {
          large?: {
            source_url?: string;
          };
          medium_large?: {
            source_url?: string;
          };
          medium?: {
            source_url?: string;
          };
        };
      };
    }[];
  };
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
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

export interface NewsCategory {
  id: number;
  name: string;
  slug: string;
}

@Injectable()
export class NewsService {
  private cache: {
    data: NewsResponse;
    expiresAt: number;
  } | null = null;

  private categoriesCache: {
    data: NewsCategory[];
    expiresAt: number;
  } | null = null;

  async findAll(
    query?: string,
    category?: number,
  ): Promise<NewsResponse> {
    const CACHE_TIME = 10 * 60 * 1000;

    if (
      !query?.trim() &&
      !category &&
      this.cache &&
      this.cache.expiresAt > Date.now()
    ) {
      console.log('Notícias carregadas do cache.');
      return this.cache.data;
    }

    try {
      const response = await axios.get<WordPressPost[]>(
        'https://www.rioverde.go.gov.br/wp-json/wp/v2/posts',
        {
          params: {
            per_page: 20,
            _embed: true,
            order: 'desc',
            orderby: 'date',
            page: 1,
            ...(category ? { categories: category } : {}),
          },
          timeout: 10000,
        },
      );

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

      const data: NewsResponse = {
        total: posts.length,
        articles: posts.map((post) => {
          const featuredMedia =
            post._embedded?.['wp:featuredmedia']?.[0];

          const featuredImage =
            featuredMedia?.media_details?.sizes?.large?.source_url ||
            featuredMedia?.media_details?.sizes?.medium_large?.source_url ||
            post.thumbnail ||
            featuredMedia?.source_url ||
            null;

          const contentImageMatch = post.content.rendered.match(
            /<img[^>]+src=["']([^"']+)["']/i,
          );

          const image =
            featuredImage ||
            contentImageMatch?.[1] ||
            null;

          const description =
            post.excerpt.rendered
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

      console.log(
        `Prefeitura de Rio Verde: ${data.articles.length} notícias carregadas.`,
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        console.error(
          'Erro ao consultar a API de notícias da Prefeitura:',
          error.response?.data,
        );

        throw new BadGatewayException(
          `Não foi possível consultar as notícias da Prefeitura${status ? ` (${status})` : ''}.`,
        );
      }

      console.error('Erro inesperado:', error);

      throw new BadGatewayException(
        'Não foi possível consultar as notícias da Prefeitura.',
      );
    }
  }

  async findCategories(): Promise<NewsCategory[]> {
    const CACHE_TIME = 60 * 60 * 1000;

    if (
      this.categoriesCache &&
      this.categoriesCache.expiresAt > Date.now()
    ) {
      console.log('Categorias carregadas do cache.');
      return this.categoriesCache.data;
    }

    try {
      const response = await axios.get<WordPressCategory[]>(
        'https://www.rioverde.go.gov.br/wp-json/wp/v2/categories',
        {
          params: {
            per_page: 100,
            hide_empty: true,
          },
          timeout: 10000,
        },
      );

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

      console.log(
        `Prefeitura de Rio Verde: ${categories.length} categorias carregadas.`,
      );

      return categories;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        console.error(
          'Erro ao consultar as categorias da Prefeitura:',
          error.response?.data,
        );

        throw new BadGatewayException(
          `Não foi possível consultar as categorias da Prefeitura${status ? ` (${status})` : ''}.`,
        );
      }

      console.error('Erro inesperado:', error);

      throw new BadGatewayException(
        'Não foi possível consultar as categorias da Prefeitura.',
      );
    }
  }
}