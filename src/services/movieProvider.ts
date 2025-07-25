import { makeProviders, makeStandardFetcher, targets } from '@movie-web/providers';
import { MediaObject, ProviderOutput } from '../types';

class MovieProviderService {
  private fetcher: any;
  private providers: any;

  constructor() {
    this.fetcher = makeStandardFetcher(fetch);
    this.providers = makeProviders({
      fetcher: this.fetcher,
      target: targets.NATIVE
    });
  }

  async searchSources(media: MediaObject): Promise<ProviderOutput> {
    try {
      console.log('Scraping media:', media);
      const output = await this.providers.runAll({ media });
      console.log('Provider output:', output);
      return output;
    } catch (error) {
      console.error('Provider error:', error);
      throw new Error(`Failed to get streaming sources: ${(error as Error).message}`);
    }
  }

  buildMediaObject(
    tmdbId: string,
    type: 'movie' | 'show',
    title: string,
    year: string | undefined,
    season: string | null = null,
    episode: string | null = null
  ): MediaObject {
    const media: MediaObject = {
      type,
      title: title || 'Unknown Title',
      releaseYear: year ? parseInt(year, 10) : 0,
      tmdbId
    };

    if (type === 'show') {
      if (!season || !episode) {
        throw new Error('season and episode parameters are required for TV shows');
      }
      media.season = { number: parseInt(season, 10) };
      media.episode = { number: parseInt(episode, 10) };
    }

    return media;
  }

  test(): { message: string; target: string; fetcher: string } {
    return {
      message: '@movie-web/providers is working!',
      target: 'NATIVE',
      fetcher: 'Standard fetcher initialized'
    };
  }
}

export default new MovieProviderService();
