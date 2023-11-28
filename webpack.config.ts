// webpack.config.ts
import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';
//import CopyWebpackPlugin from 'copy-webpack-plugin';

const config = async (env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    // Add custom config here...
    //plugins: [
    //    new CopyWebpackPlugin({
    //      patterns: [
    //        { from: 'synoptic/websage.jssd', to: '.', noErrorOnMissing: true },
    //      ]
    //    })
    //],
  });
};

export default config;