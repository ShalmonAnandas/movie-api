import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  blob: {
    readWriteToken: string | undefined;
    isEnabled: boolean;
  };
  paths: {
    playlists: string;
  };
  cleanup: {
    intervalDays: number;
    retentionHours: number;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  blob: {
    readWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
    isEnabled: !!process.env.BLOB_READ_WRITE_TOKEN
  },
  paths: {
    playlists: path.join(__dirname, '../../playlists')
  },
  cleanup: {
    intervalDays: 15,
    retentionHours: 24
  }
};

export default config;
