import {
  BadGatewayException,
  Injectable,
} from '@nestjs/common';

import axios from 'axios';
import * as cheerio from 'cheerio';

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

@Injectable()
export class RestaurantService {
  private readonly baseUrl =
    'https://visiterioverde.com.br/gastronomia';

  private readonly headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',

    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',

    'Accept-Language':
      'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  async findAll(): Promise<RestaurantResponse> {
    try {
      console.log('========================================');
      console.log('ROUTS - Buscando restaurantes');
      console.log('Fonte:', this.baseUrl);
      console.log('========================================');

      const restaurants: Restaurant[] = [];

      /*
       * Lista de páginas que ainda precisam ser visitadas.
       *
       * Começamos pela página principal.
       */
      const pagesToVisit: string[] = [this.baseUrl];

      /*
       * Guarda as URLs que já foram visitadas.
       *
       * Isso evita loops caso o site repita algum link
       * de paginação.
       */
      const visitedPages = new Set<string>();

      while (pagesToVisit.length > 0) {
        const pageUrl = pagesToVisit.shift();

        if (!pageUrl) {
          continue;
        }

        /*
         * Se já visitamos essa página, ignoramos.
         */
        if (visitedPages.has(pageUrl)) {
          continue;
        }

        visitedPages.add(pageUrl);

        console.log('');
        console.log(
          `Buscando página ${visitedPages.size}:`,
          pageUrl,
        );

        const response = await axios.get(pageUrl, {
          headers: this.headers,
          timeout: 15000,
        });

        console.log(
          'STATUS:',
          response.status,
        );

        console.log(
          'TAMANHO HTML:',
          response.data.length,
        );

        const $ = cheerio.load(response.data);

        /*
         * Extrai os restaurantes encontrados
         * nesta página.
         */
        $('.card-page').each(
          (index, element) => {
            const card = $(element);

            const name = this.extractName(card);

            /*
             * Se não houver nome, não é um
             * estabelecimento válido.
             */
            if (!name) {
              return;
            }

            const image =
              this.extractImage(card);

            const address =
              this.extractField(
                card,
                'Endereço',
              );

            const neighborhood =
              this.extractField(
                card,
                'Bairro',
              );

            const phone =
              this.extractField(
                card,
                'Telefone',
              );

            const instagram =
              this.extractInstagram(card);

            const mapsUrl =
              this.extractMapsUrl(card);

            const id =
              this.createId(
                name,
                address,
                restaurants.length +
                  index,
              );

            /*
             * Verifica se esse estabelecimento
             * já foi encontrado em outra página.
             */
            const alreadyExists =
              restaurants.some(
                (restaurant) =>
                  restaurant.id === id,
              );

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
          },
        );

        /*
         * Descobre automaticamente os links
         * das próximas páginas.
         *
         * Exemplo:
         *
         * /gastronomia?page=2
         * /gastronomia?page=3
         * /gastronomia?page=4
         */
        $('a[href]').each(
          (_, anchor) => {
            const href = $(anchor)
              .attr('href')
              ?.trim();

            if (!href) {
              return;
            }

            const absoluteUrl =
              this.normalizeUrl(href);

            /*
             * Só adicionamos URLs que pertencem
             * à paginação da gastronomia.
             */
            if (
              !this.isPaginationUrl(
                absoluteUrl,
              )
            ) {
              return;
            }

            /*
             * Se ainda não visitamos nem
             * colocamos na fila, adicionamos.
             */
            if (
              !visitedPages.has(
                absoluteUrl,
              ) &&
              !pagesToVisit.includes(
                absoluteUrl,
              )
            ) {
              pagesToVisit.push(
                absoluteUrl,
              );
            }
          },
        );

        console.log(
          'TOTAL ATÉ AGORA:',
          restaurants.length,
        );

        console.log(
          'PÁGINAS NA FILA:',
          pagesToVisit.length,
        );
      }

      console.log('');
      console.log(
        '========================================',
      );

      console.log(
        `TOTAL DE PÁGINAS VISITADAS: ${visitedPages.size}`,
      );

      console.log(
        `RESTAURANTES ENCONTRADOS: ${restaurants.length}`,
      );

      restaurants.forEach(
        (restaurant, index) => {
          console.log(
            `${index + 1}. ${restaurant.name}`,
          );
        },
      );

      console.log(
        '========================================',
      );

      return {
        city: 'Rio Verde',
        total: restaurants.length,
        restaurants,
      };
    } catch (error) {
      console.error(
        'ERRO AO BUSCAR RESTAURANTES:',
        error,
      );

      throw new BadGatewayException(
        'Não foi possível obter os restaurantes de Rio Verde.',
      );
    }
  }

  /**
   * Verifica se uma URL pertence à
   * paginação da página de gastronomia.
   */
  private isPaginationUrl(
    url: string,
  ): boolean {
    try {
      const parsedUrl = new URL(url);

      /*
       * Precisa ser do mesmo domínio.
       */
      if (
        parsedUrl.hostname !==
        'visiterioverde.com.br'
      ) {
        return false;
      }

      /*
       * Precisa ser exatamente a página
       * de gastronomia.
       */
      if (
        parsedUrl.pathname !==
        '/gastronomia'
      ) {
        return false;
      }

      /*
       * A paginação utiliza:
       *
       * ?page=2
       * ?page=3
       * etc.
       */
      const page =
        parsedUrl.searchParams.get(
          'page',
        );

      if (!page) {
        return false;
      }

      const pageNumber =
        Number(page);

      /*
       * Aceita somente números positivos.
       */
      return (
        Number.isInteger(pageNumber) &&
        pageNumber > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrai o nome do estabelecimento.
   */
  private extractName(
    card: cheerio.Cheerio<any>,
  ): string | null {
    const name = card
      .find('.card-page-title')
      .first()
      .text()
      .trim();

    return name || null;
  }

  /**
   * Extrai a imagem principal do card.
   *
   * O site utiliza "src", mas também verificamos
   * atributos utilizados para carregamento lazy.
   */
  private extractImage(
    card: cheerio.Cheerio<any>,
  ): string | null {
    const image = card
      .find('img')
      .first();

    if (!image.length) {
      return null;
    }

    const src =
      image.attr('src') ||
      image.attr('data-src') ||
      image.attr('data-lazy-src') ||
      null;

    if (!src) {
      return null;
    }

    return this.normalizeUrl(src);
  }

  /**
   * Extrai informações como:
   *
   * Endereço
   * Bairro
   * Telefone
   */
  private extractField(
    card: cheerio.Cheerio<any>,
    fieldName: string,
  ): string | null {
    let value: string | null = null;

    card.find('p').each(
      (_, paragraph) => {
        const paragraphElement =
          card.find(paragraph);

        const strongText =
          paragraphElement
            .find('strong')
            .first()
            .text()
            .trim()
            .replace(':', '')
            .trim();

        if (
          strongText.toLowerCase() !==
          fieldName.toLowerCase()
        ) {
          return;
        }

        const clone =
          paragraphElement.clone();

        clone.find('strong').remove();

        const text = clone
          .text()
          .replace(/\s+/g, ' ')
          .replace(/^:\s*/, '')
          .trim();

        if (text) {
          value = text;
        }
      },
    );

    return value;
  }

  /**
   * Procura o link oficial do Instagram
   * dentro do card.
   */
  private extractInstagram(
    card: cheerio.Cheerio<any>,
  ): string | null {
    let instagram: string | null =
      null;

    card.find('a[href]').each(
      (_, anchor) => {
        const href = card
          .find(anchor)
          .attr('href')
          ?.trim();

        if (!href) {
          return;
        }

        if (
          href.includes(
            'instagram.com/',
          )
        ) {
          instagram = href;
        }
      },
    );

    return instagram;
  }

  /**
   * Procura o link do Google Maps.
   */
  private extractMapsUrl(
    card: cheerio.Cheerio<any>,
  ): string | null {
    let mapsUrl: string | null = null;

    card.find('a[href]').each(
      (_, anchor) => {
        const href = card
          .find(anchor)
          .attr('href')
          ?.trim();

        if (!href) {
          return;
        }

        if (
          href.includes(
            'maps.app.goo.gl',
          ) ||
          href.includes(
            'google.com/maps',
          ) ||
          href.includes('g.co/')
        ) {
          mapsUrl = href;
        }
      },
    );

    return mapsUrl;
  }

  /**
   * Converte URLs relativas em URLs absolutas.
   */
  private normalizeUrl(
    url: string,
  ): string {
    try {
      return new URL(
        url,
        'https://visiterioverde.com.br',
      ).toString();
    } catch {
      return url;
    }
  }

  /**
   * Cria um ID estável utilizando o nome
   * e o endereço.
   *
   * Isso é importante porque existem
   * estabelecimentos com o mesmo nome
   * em locais diferentes.
   */
  private createId(
    name: string,
    address: string | null,
    index: number,
  ): string {
    const base = [
      name,
      address,
    ]
      .filter(Boolean)
      .join(' ');

    const slug =
      this.slugify(base);

    return (
      slug ||
      `restaurant-${index + 1}`
    );
  }

  /**
   * Transforma o nome/endereço em um slug.
   */
  private slugify(
    value: string,
  ): string {
    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-+|-+$/g,
        '');
  }
}

