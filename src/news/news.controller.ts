import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('api/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(
    @Query('q') query?: string,
    @Query('category') category?: string,
  ) {
    const categoryId = category
      ? Number(category)
      : undefined;

    return this.newsService.findAll(query, categoryId);
  }

  @Get('categories')
  findCategories() {
    return this.newsService.findCategories();
  }
}