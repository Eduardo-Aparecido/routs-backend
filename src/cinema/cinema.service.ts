import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SessionItem {
  time: string;
  language: string;
  format: string | null;
  accessibility: boolean;
}

export interface SessionDay {
  date: string;
  items: SessionItem[];
}

export interface Movie {
  id: string;
  title: string;
  poster: string | null;
  releaseDate: string | null;
  genre: string | null;
  director: string | null;
  cast: string[];
  classification: string | null;
  description: string | null;
  sessions: SessionDay[];
}

export interface Cinema {
  id: string;
  name: string;
  address: string;
  city: string;
  description: string;
  website: string;
  programmingUrl: string;
  movies: Movie[];
}

@Injectable()
export class CinemaService {
  private readonly cinemas: Omit<Cinema, 'movies'>[] = [
    {
      id: 'cine-a-rio-verde',
      name: 'Cine A Rio Verde',
      address: 'Avenida Presidente Vargas, 1740',
      city: 'Rio Verde - GO',
      description:
        'Cinema localizado no Shopping Rio Verde, com programação de filmes em cartaz e lançamentos.',
      website: 'https://www.cinea.com.br/',
      programmingUrl:
        'https://www.adorocinema.com/programacao/cinema-G0GTI/',
    },
    {
      id: 'cineflix-buriti-rio-verde',
      name: 'Cineflix Buriti Shopping Rio Verde',
      address: 'BR-060, 1044 - Parque Bougainville',
      city: 'Rio Verde - GO',
      description:
        'Cinema do Buriti Shopping Rio Verde com programação de filmes, sessões e opções de compra de ingressos.',
      website: 'https://www.buritishoppingrioverde.com.br/',
      programmingUrl:
        'https://www.adorocinema.com/programacao/cinema-F0620/',
    },
  ];

  async findAll() {
    const cinemas = await Promise.all(
      this.cinemas.map(async (cinema) => {
        const movies = await this.getProgramming(
          cinema.programmingUrl,
        );

        return {
          ...cinema,
          movies,
        };
      }),
    );

    return {
      city: 'Rio Verde - GO',
      total: cinemas.length,
      cinemas,
    };
  }

  private async getProgramming(url: string): Promise<Movie[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
        },
      });

      console.log('STATUS:', response.status);
      console.log('TAMANHO HTML:', response.data.length);

      const $ = cheerio.load(response.data);

      const movieCards = $('.movie-card-theater');

      console.log('CARDS ENCONTRADOS:', movieCards.length);

      const movies: Movie[] = [];

      movieCards.each((_, element) => {
        const movie = this.extractMovie($, element);

        if (movie) {
          movies.push(movie);
        }
      });

      console.log('FILMES EXTRAÍDOS:', movies.length);

      return movies;
    } catch (error) {
      console.error(`Erro ao buscar programação: ${url}`, error);

      throw new InternalServerErrorException(
        'Não foi possível consultar a programação do cinema.',
      );
    }
  }

  private createSlug(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractMovie(
    $: cheerio.CheerioAPI,
    element: any,
  ): Movie | null {
    // ==========================================
    // TÍTULO
    // ==========================================

    const title = $(element)
      .find('.meta-title-link')
      .text()
      .trim();

    if (!title) {
      return null;
    }

    // ==========================================
    // ID DO FILME
    // ==========================================

    const id = this.createSlug(title);

    // ==========================================
    // PÔSTER
    // ==========================================

    const poster =
      $(element).find('img.thumbnail-img').attr('data-src') ||
      $(element).find('img.thumbnail-img').attr('src') ||
      null;

    // ==========================================
    // DATA DE LANÇAMENTO
    // ==========================================

    const releaseDate =
      $(element)
        .find('.meta-body-info .date')
        .text()
        .trim() || null;

    // ==========================================
    // GÊNEROS
    // ==========================================

    const genreElements = $(element).find(
      '.meta-body-info .dark-grey-link',
    );

    const genres: string[] = [];

    genreElements.each((_, genreElement) => {
      const genre = $(genreElement).text().trim();

      if (genre) {
        genres.push(genre);
      }
    });

    // ==========================================
    // DIRETOR
    // ==========================================

    const directorElements = $(element).find(
      '.meta-body-direction .dark-grey-link',
    );

    const directors: string[] = [];

    directorElements.each((_, directorElement) => {
      const director = $(directorElement).text().trim();

      if (director) {
        directors.push(director);
      }
    });

    // ==========================================
    // ELENCO
    // ==========================================

    const castElements = $(element).find(
      '.meta-body-actor .dark-grey-link',
    );

    const cast: string[] = [];

    castElements.each((_, castElement) => {
      const actor = $(castElement).text().trim();

      if (actor) {
        cast.push(actor);
      }
    });

    // ==========================================
    // CLASSIFICAÇÃO
    // ==========================================

    const classification =
      $(element)
        .find('.certificate-text')
        .text()
        .trim() || null;

    // ==========================================
    // DESCRIÇÃO
    // ==========================================

    const description =
      $(element)
        .find('.synopsis .content-txt')
        .text()
        .trim() || null;

    // ==========================================
    // SESSÕES
    // ==========================================

    const sessionsMap = new Map<string, SessionItem[]>();

    $(element)
      .find('.showtimes-hour-item')
      .each((_, sessionElement) => {
        // --------------------------------------
        // DATA E HORA COMPLETA
        // --------------------------------------

        const showtime = $(sessionElement).attr(
          'data-showtime-time',
        );

        // --------------------------------------
        // HORÁRIO EXIBIDO
        // --------------------------------------

        const time =
          $(sessionElement)
            .find('.showtimes-hours-item-value')
            .text()
            .trim() || null;

        if (!showtime || !time) {
          return;
        }

        // --------------------------------------
        // DATA
        // --------------------------------------

        const date = showtime.split('T')[0];

        // --------------------------------------
        // VERSÃO / IDIOMA
        // --------------------------------------

        const version = $(sessionElement)
          .closest('.showtimes-version')
          .find('.text')
          .text()
          .trim();

        const language = version.includes('Dublado')
          ? 'Dublado'
          : version.includes('Legendado')
            ? 'Legendado'
            : version.includes('Original')
              ? 'Original'
              : 'Não informado';

        // --------------------------------------
        // EXPERIÊNCIAS / FORMATO
        // --------------------------------------

        const experiencesAttribute = $(sessionElement).attr(
          'data-experiences',
        );

        let format: string | null = null;
        let accessibility = false;

        if (experiencesAttribute) {
          try {
            const experiences = JSON.parse(
              experiencesAttribute,
            );

            const formats: string[] = [];

            experiences.forEach((experience: string) => {
              if (experience.includes('3D')) {
                formats.push('3D');
              }

              if (experience.includes('Digital')) {
                formats.push('Digital');
              }

              if (experience.includes('Accessibility')) {
                accessibility = true;
              }
            });

            format = formats.length
              ? [...new Set(formats)].join(', ')
              : null;
          } catch {
            format = null;
            accessibility = false;
          }
        }

        // --------------------------------------
        // AGRUPA A SESSÃO POR DATA
        // --------------------------------------

        if (!sessionsMap.has(date)) {
          sessionsMap.set(date, []);
        }

        sessionsMap.get(date)!.push({
          time,
          language,
          format,
          accessibility,
        });
      });

    // ==========================================
    // TRANSFORMA O MAPA EM ARRAY
    // ==========================================

    const sessions: SessionDay[] = Array.from(
      sessionsMap.entries(),
    ).map(([date, items]) => ({
      date,
      items,
    }));

    // ==========================================
    // RETORNO DO FILME
    // ==========================================

    return {
      id,
      title,
      poster,
      releaseDate,
      genre: genres.join(', ') || null,
      director: directors.join(', ') || null,
      cast,
      classification,
      description,
      sessions,
    };
  }
}

